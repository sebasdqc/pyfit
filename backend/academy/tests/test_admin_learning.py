"""Panel de admin: evidencia de aprendizaje (ganancia pre/post, repaso) y cola de
producción de medios. Solo agregados y siempre acotado al tenant."""

from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIClient

from academy.models import CourseAssessment, Lesson, Module, QuestionReview, Tenant
from academy.tests._fixtures import enroll, make_course, make_user

METRICAS = '/api/academy/admin/metricas/?dias=30'
MEDIOS = '/api/academy/admin/medios/'


class _Base(TestCase):
    def setUp(self):
        self.admin = make_user('admin@x.com', role='admin')
        self.instructor = make_user('ins@x.com', academy_instructor=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)


class AprendizajeTests(_Base):
    def _evaluar(self, student, enrollment, pre, post):
        CourseAssessment.objects.create(enrollment=enrollment, kind='diagnostico', puntaje=pre)
        if post is not None:
            CourseAssessment.objects.create(enrollment=enrollment, kind='final', puntaje=post)

    def test_vacio(self):
        a = self.client.get(METRICAS).json()['aprendizaje']
        self.assertEqual((a['con_ambas'], a['ganancia_promedio'], a['ganancia_normalizada']), (0, None, None))

    def test_ganancia_promedio_y_por_curso(self):
        course, _, _ = make_course(self.instructor)
        a1, a2, a3 = (make_user(f'a{i}@x.com') for i in range(3))
        e1, e2, e3 = (enroll(a, course) for a in (a1, a2, a3))
        self._evaluar(a1, e1, 25, 75)    # +50
        self._evaluar(a2, e2, 50, 100)   # +50
        self._evaluar(a3, e3, 40, None)  # solo diagnóstico: no entra en la ganancia
        data = self.client.get(METRICAS).json()
        a = data['aprendizaje']
        self.assertEqual((a['diagnosticos'], a['finales'], a['con_ambas']), (3, 2, 2))
        self.assertEqual(a['ganancia_promedio'], 50)
        # normalizada: (50/75 + 50/50)/2 = 83 %
        self.assertEqual(a['ganancia_normalizada'], 83)
        fila = [c for c in data['cursos']['filas'] if c['id'] == course.id][0]
        self.assertEqual((fila['ganancia'], fila['evaluados']), (50, 2))

    def test_otro_tenant_no_cuenta(self):
        otro = Tenant.objects.create(nombre='o', slug='o', dominio='o.zyfit.app')
        course, _, _ = make_course(self.instructor)
        course.tenant = otro
        course.save()
        s = make_user('s@x.com')
        self._evaluar(s, enroll(s, course), 10, 90)
        self.assertEqual(self.client.get(METRICAS).json()['aprendizaje']['con_ambas'], 0)

    def test_uso_del_repaso(self):
        course, preguntas, _ = make_course(self.instructor)
        s = make_user('s@x.com')
        enroll(s, course)
        hoy = date.today()
        for i, q in enumerate(preguntas[:4]):
            QuestionReview.objects.create(
                user=s, question=q, caja=4 if i < 2 else 1, proxima_revision=hoy, ultima_revision=hoy,
            )
        r = self.client.get(METRICAS).json()['aprendizaje']['repaso']
        self.assertEqual(r, {'estudiantes_con_mazo': 1, 'preguntas_en_mazo': 4, 'dominadas': 2, 'estudiantes_repasando': 1})


class MediosTests(_Base):
    def _lecciones(self):
        course, _, _ = make_course(self.instructor)
        modulo = Module.objects.filter(course=course).first()
        guion = ' '.join(['palabra'] * 300)
        con = Lesson.objects.create(module=modulo, orden=10, titulo='Con video', tipo='video',
                                    video_url='https://cdn.x.com/a.mp4', subtitulos_url='https://cdn.x.com/a.vtt')
        sin = Lesson.objects.create(module=modulo, orden=11, titulo='Sin video', tipo='video', contenido=guion)
        audio = Lesson.objects.create(module=modulo, orden=12, titulo='Sin audio', tipo='audio', contenido='corto')
        return course, con, sin, audio

    def test_reporte(self):
        course, con, sin, audio = self._lecciones()
        d = self.client.get(MEDIOS).json()
        self.assertEqual((d['total'], d['con_medio'], d['pendientes'], d['con_subtitulos'], d['avance']), (3, 1, 2, 1, 33))
        # 300 palabras a 150 ppm = 2 min; el audio corto cuenta 1 min mínimo.
        self.assertEqual(d['minutos_por_grabar'], 3)
        fila = d['cursos'][0]
        self.assertEqual((fila['course_id'], fila['total'], fila['con_medio']), (course.id, 3, 1))
        ids = {p['lesson_id']: p for p in fila['pendientes']}
        self.assertEqual(set(ids), {sin.id, audio.id})
        self.assertEqual(ids[sin.id]['minutos_estimados'], 2)

    def test_curso_borrador_no_cuenta(self):
        course, *_ = self._lecciones()
        course.publicado = False
        course.save()
        self.assertEqual(self.client.get(MEDIOS).json()['total'], 0)

    def test_solo_admin(self):
        for u in (self.instructor, make_user('alu@x.com')):
            self.client.force_authenticate(u)
            self.assertEqual(self.client.get(MEDIOS).status_code, 403)


class VerificacionDeCorreoTests(_Base):
    def test_el_payload_del_usuario_informa_si_el_correo_esta_verificado(self):
        u = make_user('v@x.com')
        client = APIClient()
        client.force_authenticate(u)
        self.assertFalse(client.get('/api/academy/me/').json()['email_verificado'])
        u.email_verificado = True
        u.save()
        self.assertTrue(client.get('/api/academy/me/').json()['email_verificado'])

    def test_la_lista_de_usuarios_del_admin_muestra_la_verificacion(self):
        make_user('sin@x.com')
        make_user('con@x.com', email_verificado=True)
        filas = {f['email']: f for f in self.client.get('/api/academy/admin/usuarios/').json()}
        self.assertFalse(filas['sin@x.com']['email_verificado'])
        self.assertTrue(filas['con@x.com']['email_verificado'])

    def test_metricas_cuentan_estudiantes_sin_verificar(self):
        course, _, _ = make_course(self.instructor)
        for i, ok in enumerate((True, False, False)):
            enroll(make_user(f's{i}@x.com', email_verificado=ok), course)
        e = self.client.get(METRICAS).json()['estudiantes']
        self.assertEqual((e['total'], e['sin_verificar']), (3, 2))
