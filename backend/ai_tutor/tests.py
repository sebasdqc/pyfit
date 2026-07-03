"""Tests del Tutor de Academy.

Cubren lo exigido por la especificación:
  • RAG: la recuperación devuelve el chunk correcto para una pregunta anclada.
  • Guardrails: preguntas de diagnóstico médico y de diseño de programa personalizado
    se REDIRIGEN (sin llamar a la IA ni gastar cuota).
  • Rate limiting por tier (free vs pro): límite diario y respuesta 429.

Los tests NO cargan el modelo de embeddings real ni llaman a Groq: se mockean
`ai_tutor.embeddings.embed_text` y `ai_tutor.services._call_groq_chat`, de modo que
lo que se prueba es la lógica del tutor (ranking coseno, guardrails, cuotas), no las
dependencias externas.
"""

from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from academy.models import Course, Module, Lesson, School
from users.models import Profile

from ai_tutor import guardrails, retrieval, services
from ai_tutor.models import TutorChunk, TutorMessage, TutorDailyUsage

User = get_user_model()


def _fake_usage():
    return {'tokens_in': 120, 'tokens_out': 60, 'elapsed_ms': 12}


class _Base(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='a@x.com', email='a@x.com', password='x')
        self.client = APIClient()

    def _course(self, slug='curso-1'):
        school = School.objects.create(nombre='Ciencia del Entrenamiento', slug=f's-{slug}')
        course = Course.objects.create(
            titulo='Curso 1', slug=slug, categoria='entrenamiento',
            nivel='principiante', publicado=True, school=school,
        )
        module = Module.objects.create(course=course, orden=1, titulo='Periodización')
        lesson = Lesson.objects.create(module=module, orden=1, titulo='Qué es periodizar', tipo='texto')
        return course, module, lesson

    def _chunk(self, course, lesson, idx, contenido, embedding, **kw):
        return TutorChunk.objects.create(
            lesson=lesson, course=course, curso_titulo=course.titulo, curso_slug=course.slug,
            leccion_titulo=lesson.titulo, chunk_index=idx, contenido=contenido,
            content_hash=f'h{idx}', embedding=embedding, embedding_model='test', **kw,
        )


# ─── RAG ───────────────────────────────────────────────────────────────────────

class RetrievalTests(_Base):
    def test_recupera_el_chunk_correcto(self):
        course, _m, lesson = self._course()
        a = self._chunk(course, lesson, 0, 'La periodización organiza la carga.', [1.0, 0.0, 0.0])
        self._chunk(course, lesson, 1, 'La hidratación durante el ejercicio.', [0.0, 1.0, 0.0])

        # La pregunta "apunta" al vector del chunk A.
        with patch('ai_tutor.embeddings.embed_text', return_value=[0.9, 0.1, 0.0]):
            results = retrieval.retrieve('¿qué es periodizar?', course_id=course.id)

        self.assertTrue(results, 'debe recuperar al menos un chunk')
        self.assertEqual(results[0][0].id, a.id)
        # El chunk irrelevante queda por debajo del umbral y no se devuelve.
        self.assertEqual(len(results), 1)

    def test_sin_chunks_devuelve_vacio(self):
        with patch('ai_tutor.embeddings.embed_text', return_value=[1.0, 0.0, 0.0]):
            self.assertEqual(retrieval.retrieve('cualquier cosa'), [])


# ─── Guardrails ─────────────────────────────────────────────────────────────────

class GuardrailTests(_Base):
    def test_diagnostico_medico_redirige(self):
        r = guardrails.check('Me duele la rodilla al sentarme, ¿qué hago?')
        self.assertIsNotNone(r)
        self.assertEqual(r['tipo'], guardrails.TIPO_MEDICO)

    def test_medicacion_redirige(self):
        r = guardrails.check('¿Qué medicamento tomo para el dolor muscular?')
        self.assertIsNotNone(r)
        self.assertEqual(r['tipo'], guardrails.TIPO_MEDICO)

    def test_diseno_programa_redirige(self):
        r = guardrails.check('Diséñame una rutina de hipertrofia de 4 días para mí')
        self.assertIsNotNone(r)
        self.assertEqual(r['tipo'], guardrails.TIPO_PROGRAMA)

    def test_pregunta_conceptual_no_redirige(self):
        self.assertIsNone(guardrails.check('¿Qué diferencia hay entre MEV y MAV?'))
        # "lesión" en abstracto es conceptual, no un caso concreto → no redirige.
        self.assertIsNone(guardrails.check('¿Qué es una lesión por sobreuso?'))


# ─── Servicio (orquestación + guardrail end-to-end) ─────────────────────────────

class ServiceTests(_Base):
    def test_pregunta_conceptual_llama_ia_y_registra_uso(self):
        with patch('ai_tutor.services._call_groq_chat', return_value=('El MEV es el volumen mínimo eficaz.', _fake_usage())) as mock_groq:
            conv, msg = services.answer(
                user=self.user, question='¿Qué es el MEV?',
                fecha=date(2026, 7, 2), course_id=None,
            )
        mock_groq.assert_called_once()
        self.assertEqual(msg.role, TutorMessage.ROLE_ASSISTANT)
        self.assertFalse(msg.redirigido)
        self.assertEqual(msg.tokens_out, 60)
        # Se registró la cuota del día y quedaron ambos mensajes (user + tutor).
        self.assertEqual(TutorDailyUsage.used_today(self.user, date(2026, 7, 2)), 1)
        self.assertEqual(conv.mensajes.count(), 2)

    def test_guardrail_no_llama_ia_ni_gasta_cuota(self):
        with patch('ai_tutor.services._call_groq_chat') as mock_groq:
            _conv, msg = services.answer(
                user=self.user, question='Me lastimé el hombro, ¿qué debo hacer?',
                fecha=date(2026, 7, 2), course_id=None,
            )
        mock_groq.assert_not_called()
        self.assertTrue(msg.redirigido)
        self.assertEqual(TutorDailyUsage.used_today(self.user, date(2026, 7, 2)), 0)


# ─── Rate limiting por tier ─────────────────────────────────────────────────────

class RateLimitTests(_Base):
    def test_limite_por_plan(self):
        # Sin perfil → tier por defecto (starter = free = 3).
        self.assertEqual(TutorDailyUsage.limit_for(self.user), 3)
        # Con plan pro = 30.
        Profile.objects.create(user=self.user, nombre='A', plan='pro')
        self.user.refresh_from_db()
        self.assertEqual(TutorDailyUsage.limit_for(self.user), 30)

    def test_limite_por_academy_pro_sin_zyfit_pro(self):
        """Academy Pro es un paquete separado de "Zyfit Pro" (Profile.plan),
        pero como el tutor vive dentro de Academy, tener Academy Pro también
        debe subir la cuota diaria a 30 aunque Profile.plan siga en starter."""
        from academy.models import AcademySubscription

        Profile.objects.create(user=self.user, nombre='A')  # plan default = starter
        self.assertEqual(TutorDailyUsage.limit_for(self.user), 3)
        AcademySubscription.objects.create(user=self.user, estado=AcademySubscription.ESTADO_ACTIVA)
        self.assertEqual(TutorDailyUsage.limit_for(self.user), 30)

    def test_reached_limit(self):
        hoy = date(2026, 7, 2)
        self.assertFalse(TutorDailyUsage.reached_limit(self.user, hoy))
        for _ in range(3):
            TutorDailyUsage.record(self.user, hoy)
        self.assertTrue(TutorDailyUsage.reached_limit(self.user, hoy))

    def test_endpoint_429_cuando_supera_el_limite(self):
        hoy = date.today()
        # Prellenamos el contador del día al límite del tier free (3).
        TutorDailyUsage.objects.create(user=self.user, fecha=hoy, count=3)
        self.client.force_authenticate(self.user)
        with patch('ai_tutor.services._call_groq_chat', return_value=('no debería llamarse', _fake_usage())) as mock_groq:
            res = self.client.post('/api/academy/tutor/chat/', {'mensaje': '¿Qué es MAV?'}, format='json')
        self.assertEqual(res.status_code, 429)
        self.assertEqual(res.json()['code'], 'daily_limit')
        mock_groq.assert_not_called()

    def test_endpoint_responde_ok(self):
        self.client.force_authenticate(self.user)
        with patch('ai_tutor.services._call_groq_chat', return_value=('El MRV es el volumen máximo recuperable.', _fake_usage())):
            res = self.client.post('/api/academy/tutor/chat/', {'mensaje': '¿Qué es el MRV?'}, format='json')
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn('conversation_id', body)
        self.assertEqual(body['mensaje']['role'], 'assistant')
        self.assertEqual(body['cuota']['usados'], 1)
