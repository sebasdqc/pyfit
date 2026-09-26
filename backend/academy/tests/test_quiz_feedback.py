from django.test import SimpleTestCase

from academy.management.commands.seed_course_content import parse_course_markdown
from academy.quiz_feedback import build_default_question_feedback


class QuizFeedbackTests(SimpleTestCase):
    def test_default_feedback_identifies_all_correct_options_and_module(self):
        correcta, incorrecta = build_default_question_feedback(
            opciones=[
                {'id': 'a', 'texto': 'Primera opción'},
                {'id': 'b', 'texto': 'Segunda opción'},
            ],
            respuestas_correctas=['a', 'b'],
            contexto_titulo='Decisiones de carga',
        )

        self.assertIn('«Primera opción»', correcta)
        self.assertIn('«Segunda opción»', incorrecta)
        self.assertIn('seleccionarse conjuntamente', incorrecta)
        self.assertIn('«Decisiones de carga»', correcta)

    def test_parser_keeps_explicit_question_feedback(self):
        data = parse_course_markdown('''# Curso\n\n## Módulo 1: Base\n\n### Lección 1 — Evaluación (tipo: quiz)\n\n#### Pregunta 1 (tipo: opcion_unica, puntos: 1)\n¿Pregunta?\n- [a] No\n- [b] Sí ✓\n> Feedback correcta: Bien razonado.\n> Feedback incorrecta: Revisa el concepto.\n''')

        question = data['modulos'][0]['lecciones'][0]['preguntas'][0]
        self.assertEqual(question['feedback_correcta'], 'Bien razonado.')
        self.assertEqual(question['feedback_incorrecta'], 'Revisa el concepto.')
