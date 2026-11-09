"""generate_question_feedback: no inventa, no pisa lo escrito a mano y no escribe
sin --apply. El modelo se simula: aquí se prueba la red de seguridad, no la IA."""

import json
from io import StringIO
from types import SimpleNamespace
from unittest import mock

from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings

from academy.management.commands.generate_question_feedback import parsear_respuesta
from academy.models import Lesson, Question
from academy.quiz_feedback import build_default_question_feedback
from academy.tests._fixtures import make_course, make_user

CMD = 'academy.management.commands.generate_question_feedback.get_llm_client'
BUENA = json.dumps({
    'correcta': 'La sobrecarga progresiva exige subir el estímulo poco a poco.',
    'incorrecta': 'Subir el estímulo de golpe aumenta la fatiga sin dar tiempo a adaptarse.',
})


def cliente(contenido):
    create = mock.Mock(return_value=SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=contenido))],
    ))
    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create))), create


@override_settings(LLM_API_KEY='test-key')
class GeneradorTests(TestCase):
    def setUp(self):
        instructor = make_user('ins@x.com', academy_instructor=True)
        self.course, self.preguntas, _ = make_course(instructor, modulos=1, preguntas_por_quiz=2)
        # Texto de lección: el contexto en el que el modelo puede apoyarse.
        Lesson.objects.filter(module__course=self.course, tipo='texto').update(contenido='Texto de la lección.')
        for q in self.preguntas:  # feedback genérico, como en producción
            q.feedback_correcta, q.feedback_incorrecta = build_default_question_feedback(
                opciones=q.opciones, respuestas_correctas=q.respuestas_correctas, contexto_titulo='M1',
            )
            q.save()

    def run_cmd(self, contenido, *args):
        fake, create = cliente(contenido)
        out = StringIO()
        with mock.patch(CMD, return_value=fake):
            call_command('generate_question_feedback', '--course', self.course.slug, *args, stdout=out)
        return out.getvalue(), create

    def test_sin_apply_no_escribe_nada(self):
        antes = list(Question.objects.values_list('feedback_correcta', flat=True))
        salida, _ = self.run_cmd(BUENA)
        self.assertEqual(list(Question.objects.values_list('feedback_correcta', flat=True)), antes)
        self.assertIn('NINGUNA guardada', salida)

    def test_apply_guarda(self):
        self.run_cmd(BUENA, '--apply')
        self.assertTrue(all('sobrecarga progresiva' in q.feedback_correcta for q in Question.objects.all()))

    def test_no_pisa_feedback_escrito_a_mano(self):
        propia = self.preguntas[0]
        propia.feedback_correcta = 'Explicación de un instructor.'
        propia.save()
        salida, create = self.run_cmd(BUENA, '--apply')
        propia.refresh_from_db()
        self.assertEqual(propia.feedback_correcta, 'Explicación de un instructor.')
        self.assertEqual(create.call_count, 1)  # solo la otra pregunta
        self.assertIn('1 con feedback propio', salida)

    def test_el_modelo_solo_recibe_el_texto_de_la_leccion_sin_la_clave_de_otras(self):
        _, create = self.run_cmd(BUENA)
        mensajes = create.call_args.kwargs['messages']
        self.assertIn('Texto de la lección.', mensajes[1]['content'])
        self.assertIn('Usa SOLO la información del TEXTO DE LA LECCIÓN', mensajes[0]['content'])

    def test_exporta_para_revision(self):
        import tempfile, os
        with tempfile.TemporaryDirectory() as d:
            ruta = os.path.join(d, 'fb.json')
            self.run_cmd(BUENA, '--export', ruta)
            data = json.load(open(ruta, encoding='utf-8'))
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['curso'], self.course.slug)

    def test_sin_clave_falla_claro(self):
        with override_settings(LLM_API_KEY=''):
            with self.assertRaises(CommandError):
                call_command('generate_question_feedback', stdout=StringIO())

    def test_modulo_sin_texto_se_omite_sin_llamar_al_modelo(self):
        Lesson.objects.filter(module__course=self.course, tipo='texto').update(contenido='')
        salida, create = self.run_cmd(BUENA, '--apply')
        self.assertEqual(create.call_count, 0)
        self.assertIn('no tiene texto de lección', salida)


class ParseoTests(TestCase):
    def test_acepta_json_dentro_de_bloque_de_codigo(self):
        ok, _ = parsear_respuesta('```json\n' + BUENA + '\n```')
        self.assertIsNotNone(ok)

    def test_descarta_lo_malformado(self):
        casos = {
            'texto libre': 'no es JSON',
            '[1,2]': 'no es un objeto',
            json.dumps({'correcta': 'x'}): 'falta "incorrecta"',
            json.dumps({'correcta': 'x', 'incorrecta': ''}): 'falta "incorrecta"',
            json.dumps({'correcta': 'x' * 500, 'incorrecta': 'y'}): 'demasiado largo',
            json.dumps({'correcta': 'Tenés que repasar.', 'incorrecta': 'y'}): 'voseo',
        }
        for raw, motivo in casos.items():
            parsed, m = parsear_respuesta(raw)
            self.assertIsNone(parsed, raw)
            self.assertIn(motivo.split()[0], m)
