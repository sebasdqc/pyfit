"""Tests de Comunidad (foro Q&A) de Zyfit Academy.

Cubren lo exigido por la especificación:
  • Moderación automática: contenido dañino/spam se oculta solo (guardrails
    determinísticos interceptan sin llamar a Groq; lo demás lo clasifica Groq,
    LA MISMA integración de IA que ya usa el tutor — sin proveedor nuevo). Si
    Groq falla, fail-open (se publica, el guardrail ya filtró lo obvio).
  • Reportes: alcanzar el umbral oculta automáticamente, sin intervención humana.
  • "Mejor respuesta": solo el autor original de la pregunta puede marcarla.
  • No-gating (HARD RULE, crítico): ninguna actividad de comunidad afecta
    streak, progreso de curso o badges core — es una capa de engagement 100%
    opcional.

Mismo estilo que test_badges.py: BD real (TestCase) + APIClient con
force_authenticate. La IA se mockea sobre
`academy.community_service._call_groq_moderation` (mismo patrón que
ai_tutor.tests mockeando `ai_tutor.services._call_groq_chat`): se prueba la
lógica de comunidad, no la dependencia externa.
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from academy.community_models import (
    ESTADO_OCULTO_IA, ESTADO_OCULTO_REPORTES, ESTADO_VISIBLE,
    CommunityPost, CommunityReply,
)
from academy.models import (
    AcademyBadge, AcademyEarnedBadge, AcademyStreak, Course, Enrollment,
    Lesson, Module, School,
)
from users.models import Notification

User = get_user_model()


def _groq_ok(categoria='apropiado', razon=''):
    return {'categoria': categoria, 'razon': razon}


class _Base(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='alu@x.com', email='alu@x.com', password='x')
        self.otro = User.objects.create_user(username='otro@x.com', email='otro@x.com', password='x')
        self.instructor = User.objects.create_user(
            username='ins@x.com', email='ins@x.com', password='x', academy_instructor=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.student)
        self.escuela = School.objects.create(nombre='Escuela 1', slug='escuela-1')

    def _course(self, publicado=True, slug='curso-1'):
        return Course.objects.create(
            school=self.escuela, instructor=self.instructor, titulo=slug, slug=slug,
            categoria='entrenamiento', nivel='principiante', publicado=publicado,
        )

    def _post(self, autor=None, estado=ESTADO_VISIBLE, escuela=None, curso=None):
        return CommunityPost.objects.create(
            autor=autor or self.student, escuela=escuela or self.escuela, tenant=None,
            curso=curso, titulo='Pregunta', contenido='Contenido de la pregunta', estado=estado,
        )

    def _reply(self, post, autor=None, estado=ESTADO_VISIBLE):
        return CommunityReply.objects.create(
            post=post, autor=autor or self.otro, contenido='Una respuesta', estado=estado,
        )


# ─── Moderación automática (posts) ──────────────────────────────────────────────

class ModeracionPostTests(_Base):
    def test_post_visible_cuando_moderacion_aprueba(self):
        with patch('academy.community_service._call_groq_moderation', return_value=_groq_ok()) as mock_groq:
            res = self.client.post('/api/academy/community/posts/', {
                'escuela': self.escuela.id, 'titulo': 'Duda de técnica',
                'contenido': '¿Cómo mejorar la técnica de sentadilla?',
            }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['estado'], ESTADO_VISIBLE)
        mock_groq.assert_called_once()

    def test_post_oculto_por_ia_contenido_danino(self):
        with patch('academy.community_service._call_groq_moderation', return_value=_groq_ok('dañino', 'insulto')):
            res = self.client.post('/api/academy/community/posts/', {
                'escuela': self.escuela.id, 'titulo': 'x', 'contenido': 'contenido problemático',
            }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['estado'], ESTADO_OCULTO_IA)
        post = CommunityPost.objects.get(pk=res.data['id'])
        self.assertEqual(post.moderacion_resultado['fuente'], 'groq')

    def test_oculto_por_guardrails_sin_llamar_a_groq(self):
        with patch('academy.community_service._call_groq_moderation') as mock_groq:
            res = self.client.post('/api/academy/community/posts/', {
                'escuela': self.escuela.id, 'titulo': 'oferta',
                'contenido': 'Compra ya nuestro producto milagroso, escribeme al whatsapp',
            }, format='json')
        mock_groq.assert_not_called()
        self.assertEqual(res.data['estado'], ESTADO_OCULTO_IA)
        post = CommunityPost.objects.get(pk=res.data['id'])
        self.assertEqual(post.moderacion_resultado['fuente'], 'guardrails')

    def test_fail_open_cuando_groq_falla(self):
        with patch('academy.community_service._call_groq_moderation', side_effect=Exception('timeout')):
            res = self.client.post('/api/academy/community/posts/', {
                'escuela': self.escuela.id, 'titulo': 'x',
                'contenido': 'una pregunta normal sobre entrenamiento',
            }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['estado'], ESTADO_VISIBLE)
        post = CommunityPost.objects.get(pk=res.data['id'])
        self.assertEqual(post.moderacion_resultado['fuente'], 'fallback')

    def test_fail_open_se_mantiene_para_errores_genericos_del_sdk(self):
        """Errores genéricos (timeout, sin API key, SDK de Groq) siguen siendo
        fail-open: es una caída del servicio externo, no una respuesta que
        pudo haber sido manipulada — mismo trade-off que ya existía."""
        with patch('academy.community_service._call_groq_moderation', side_effect=ValueError('empty response')):
            res = self.client.post('/api/academy/community/posts/', {
                'escuela': self.escuela.id, 'titulo': 'x',
                'contenido': 'una pregunta normal sobre entrenamiento',
            }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['estado'], ESTADO_VISIBLE)
        post = CommunityPost.objects.get(pk=res.data['id'])
        self.assertEqual(post.moderacion_resultado['fuente'], 'fallback')

    def test_fail_closed_cuando_groq_responde_json_invalido(self):
        """A diferencia del test anterior: acá Groq SÍ responde, pero con
        texto no interpretable como JSON — el escenario que lograría un
        alumno que manipule al clasificador para romper su salida. Debe
        ocultarse para revisión, no publicarse como si nada."""
        import json
        with patch(
            'academy.community_service._call_groq_moderation',
            side_effect=json.JSONDecodeError('boom', 'doc', 0),
        ):
            res = self.client.post('/api/academy/community/posts/', {
                'escuela': self.escuela.id, 'titulo': 'x',
                'contenido': 'una pregunta normal sobre entrenamiento',
            }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['estado'], ESTADO_OCULTO_IA)
        post = CommunityPost.objects.get(pk=res.data['id'])
        self.assertEqual(post.moderacion_resultado['fuente'], 'invalido')

    def test_fail_closed_cuando_categoria_es_invalida(self):
        """Groq responde JSON válido pero con una categoría que no reconocemos
        (p. ej. un intento de manipulación que logra que responda algo fuera
        del enum) — antes esto caía al mismo 'apropiado' que una respuesta
        limpia; ahora se oculta para revisión."""
        with patch(
            'academy.community_service._call_groq_moderation',
            return_value={'categoria': 'ignora_las_reglas', 'razon': 'x'},
        ):
            res = self.client.post('/api/academy/community/posts/', {
                'escuela': self.escuela.id, 'titulo': 'x',
                'contenido': 'una pregunta normal sobre entrenamiento',
            }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['estado'], ESTADO_OCULTO_IA)
        post = CommunityPost.objects.get(pk=res.data['id'])
        self.assertEqual(post.moderacion_resultado['fuente'], 'invalido')

    def test_alumno_sin_matricula_puede_postear_general(self):
        """No hay concepto de "mis escuelas": cualquier alumno del tenant
        puede postear en cualquier escuela publicada, sin estar inscrito."""
        with patch('academy.community_service._call_groq_moderation', return_value=_groq_ok()):
            res = self.client.post('/api/academy/community/posts/', {
                'escuela': self.escuela.id, 'titulo': 'General', 'contenido': 'pregunta general',
            }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertIsNone(res.data['curso'])


# ─── Moderación automática (respuestas) ─────────────────────────────────────────

class ModeracionRespuestaTests(_Base):
    def test_respuesta_oculta_por_ia(self):
        post = self._post()
        self.client.force_authenticate(self.otro)
        with patch('academy.community_service._call_groq_moderation', return_value=_groq_ok('spam', 'link')):
            res = self.client.post(
                f'/api/academy/community/posts/{post.id}/respuestas/',
                {'contenido': 'compra aqui'}, format='json',
            )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['estado'], ESTADO_OCULTO_IA)

    def test_responder_post_oculto_no_permitido(self):
        post = self._post(autor=self.student, estado=ESTADO_OCULTO_IA)
        res = self.client.post(
            f'/api/academy/community/posts/{post.id}/respuestas/',
            {'contenido': 'una respuesta'}, format='json',
        )
        self.assertEqual(res.status_code, 400)


# ─── Reportes y umbral de auto-ocultamiento ─────────────────────────────────────

class ReportesTests(_Base):
    @override_settings(COMMUNITY_REPORT_THRESHOLD=2)
    def test_alcanza_umbral_oculta_post_automaticamente(self):
        post = self._post(autor=self.otro)
        reporters = [
            User.objects.create_user(username=f'r{i}@x.com', email=f'r{i}@x.com', password='x')
            for i in range(2)
        ]
        for u in reporters:
            self.client.force_authenticate(u)
            res = self.client.post(
                '/api/academy/community/reportes/',
                {'post_id': post.id, 'motivo': 'spam'}, format='json',
            )
            self.assertEqual(res.status_code, 201)

        post.refresh_from_db()
        self.assertEqual(post.estado, ESTADO_OCULTO_REPORTES)

    def test_no_duplica_reporte_del_mismo_usuario(self):
        post = self._post(autor=self.otro)
        for _ in range(2):
            self.client.post(
                '/api/academy/community/reportes/',
                {'post_id': post.id, 'motivo': 'spam'}, format='json',
            )
        post.refresh_from_db()
        self.assertEqual(post.reportes_count, 1)

    def test_reportar_contenido_propio_no_permitido(self):
        post = self._post(autor=self.student)
        res = self.client.post(
            '/api/academy/community/reportes/',
            {'post_id': post.id, 'motivo': 'spam'}, format='json',
        )
        self.assertEqual(res.status_code, 400)


# ─── Votos ──────────────────────────────────────────────────────────────────────

class VotosTests(_Base):
    def test_toggle_de_voto(self):
        post = self._post(autor=self.otro)
        reply = self._reply(post, autor=self.otro)

        res = self.client.post(f'/api/academy/community/respuestas/{reply.id}/votar/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, {'votos_count': 1, 'ya_voto': True})

        res2 = self.client.post(f'/api/academy/community/respuestas/{reply.id}/votar/')
        self.assertEqual(res2.data, {'votos_count': 0, 'ya_voto': False})

    def test_autovoto_no_permitido(self):
        post = self._post(autor=self.student)
        reply = self._reply(post, autor=self.student)
        res = self.client.post(f'/api/academy/community/respuestas/{reply.id}/votar/')
        self.assertEqual(res.status_code, 400)


# ─── Mejor respuesta ────────────────────────────────────────────────────────────

class MejorRespuestaTests(_Base):
    def test_solo_autor_del_post_marca_mejor_respuesta(self):
        post = self._post(autor=self.student)
        reply = self._reply(post, autor=self.otro)
        self.client.force_authenticate(self.otro)  # no es el autor de la pregunta

        res = self.client.post(
            f'/api/academy/community/posts/{post.id}/mejor-respuesta/',
            {'reply_id': reply.id}, format='json',
        )
        self.assertEqual(res.status_code, 403)

    def test_autor_marca_mejor_respuesta_ok_y_notifica(self):
        post = self._post(autor=self.student)
        reply = self._reply(post, autor=self.otro)

        res = self.client.post(
            f'/api/academy/community/posts/{post.id}/mejor-respuesta/',
            {'reply_id': reply.id}, format='json',
        )
        self.assertEqual(res.status_code, 200)
        reply.refresh_from_db()
        post.refresh_from_db()
        self.assertTrue(reply.es_mejor_respuesta)
        self.assertEqual(post.mejor_respuesta_id, reply.id)
        self.assertTrue(
            Notification.objects.filter(user=self.otro, tipo='community_mejor_respuesta').exists()
        )


# ─── Badge opcional "Colaborador" ───────────────────────────────────────────────

class BadgeColaboradorTests(_Base):
    def test_se_otorga_al_alcanzar_el_umbral(self):
        badge = AcademyBadge.objects.create(
            identificador='colaborador', nombre='Colaborador',
            criterio_tipo=AcademyBadge.CRITERIO_RESPUESTAS_UTILES, criterio_valor=2,
        )
        post1 = self._post()
        reply1 = self._reply(post1, autor=self.otro)
        post2 = self._post()
        reply2 = self._reply(post2, autor=self.otro)

        self.client.post(
            f'/api/academy/community/posts/{post1.id}/mejor-respuesta/',
            {'reply_id': reply1.id}, format='json',
        )
        self.assertFalse(AcademyEarnedBadge.objects.filter(user=self.otro, badge=badge).exists())

        self.client.post(
            f'/api/academy/community/posts/{post2.id}/mejor-respuesta/',
            {'reply_id': reply2.id}, format='json',
        )
        self.assertTrue(AcademyEarnedBadge.objects.filter(user=self.otro, badge=badge).exists())


# ─── Listado ────────────────────────────────────────────────────────────────────

class ListarPostsTests(_Base):
    def test_orden_recientes_y_top(self):
        popular = self._post()
        CommunityPost.objects.filter(pk=popular.pk).update(respuestas_count=5)
        reciente = self._post()

        res_top = self.client.get(f'/api/academy/community/posts/?escuela={self.escuela.id}&orden=top')
        self.assertEqual(res_top.data['results'][0]['id'], popular.id)

        res_recientes = self.client.get(f'/api/academy/community/posts/?escuela={self.escuela.id}')
        self.assertEqual(res_recientes.data['results'][0]['id'], reciente.id)

    def test_filtra_por_curso(self):
        curso = self._course()
        self._post()
        p_curso = self._post(curso=curso)

        res = self.client.get(f'/api/academy/community/posts/?escuela={self.escuela.id}&curso={curso.id}')
        ids = [i['id'] for i in res.data['results']]
        self.assertEqual(ids, [p_curso.id])

    def test_estado_vacio_sin_preguntas(self):
        otra_escuela = School.objects.create(nombre='Vacía', slug='vacia')
        res = self.client.get(f'/api/academy/community/posts/?escuela={otra_escuela.id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['results'], [])
        self.assertEqual(res.data['count'], 0)


# ─── No-gating (HARD RULE): comunidad nunca afecta progreso/streak/badges core ──

class NoGatingTests(_Base):
    def test_actividad_de_comunidad_no_afecta_la_racha_de_estudio(self):
        AcademyStreak.objects.create(user=self.student, racha_actual=3, mejor_racha=3)
        antes = self.client.get('/api/academy/streak/').data['racha_actual']

        with patch('academy.community_service._call_groq_moderation', return_value=_groq_ok()):
            self.client.post('/api/academy/community/posts/', {
                'escuela': self.escuela.id, 'titulo': 't', 'contenido': 'c',
            }, format='json')

        despues = self.client.get('/api/academy/streak/').data['racha_actual']
        self.assertEqual(antes, despues)

    def test_actividad_de_comunidad_no_afecta_el_progreso_del_curso(self):
        curso = self._course()
        Lesson.objects.create(
            module=Module.objects.create(course=curso, orden=1, titulo='M1'),
            orden=1, titulo='L1', tipo='texto',
        )
        enrollment = Enrollment.objects.create(student=self.student, course=curso)
        progreso_antes = enrollment.progreso

        post = self._post(curso=curso)
        self.client.force_authenticate(self.otro)
        with patch('academy.community_service._call_groq_moderation', return_value=_groq_ok()):
            self.client.post(
                f'/api/academy/community/posts/{post.id}/respuestas/',
                {'contenido': 'una respuesta'}, format='json',
            )

        enrollment.refresh_from_db()
        self.assertEqual(enrollment.progreso, progreso_antes)

    def test_actividad_de_comunidad_no_desbloquea_badges_core(self):
        badge = AcademyBadge.objects.create(
            identificador='primer-paso', nombre='Primer Paso',
            criterio_tipo=AcademyBadge.CRITERIO_PRIMERA_LECCION,
        )
        with patch('academy.community_service._call_groq_moderation', return_value=_groq_ok()):
            self.client.post('/api/academy/community/posts/', {
                'escuela': self.escuela.id, 'titulo': 't', 'contenido': 'c',
            }, format='json')

        self.assertFalse(AcademyEarnedBadge.objects.filter(user=self.student, badge=badge).exists())
