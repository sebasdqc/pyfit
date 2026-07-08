"""Tests de la racha de estudio de Zyfit Academy (academy.streak_service + endpoints).

Cubren la lógica de servicio (cálculo de racha, freeze, ruptura, recuperación y
casos límite de zona horaria) llamando a las funciones con una fecha `hoy`
explícita para ser deterministas, más la integración de que completar una lección
o rendir un quiz dispara la racha SIN una llamada extra del frontend.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from academy import streak_service
from academy.models import (
    AcademyActivityDay, AcademyStreak, Course, Enrollment, Lesson, Module,
    Question, Quiz,
)

User = get_user_model()

BASE = date(2026, 3, 2)  # lunes cualquiera


def _user(email='alu@x.com'):
    return User.objects.create_user(username=email, email=email, password='x')


def _build_streak(user, dias, base=BASE):
    """Registra `dias` días de estudio CONSECUTIVOS desde `base`. Devuelve el streak."""
    for i in range(dias):
        streak_service.record_study_activity(user, hoy=base + timedelta(days=i))
    return AcademyStreak.objects.get(user=user)


# ─── Registro básico de actividad ─────────────────────────────────────────────

class RegistroActividadTests(TestCase):
    def test_primera_actividad_inicia_racha(self):
        u = _user()
        streak = streak_service.record_study_activity(u, hoy=BASE)
        self.assertEqual(streak.racha_actual, 1)
        self.assertEqual(streak.mejor_racha, 1)
        self.assertEqual(streak.ultima_actividad, BASE)
        self.assertEqual(AcademyActivityDay.objects.filter(user=u).count(), 1)

    def test_actividad_idempotente_mismo_dia(self):
        u = _user()
        streak_service.record_study_activity(u, hoy=BASE)
        streak = streak_service.record_study_activity(u, hoy=BASE, origen='quiz')
        self.assertEqual(streak.racha_actual, 1)
        # Un solo día registrado aunque haya varias actividades.
        self.assertEqual(AcademyActivityDay.objects.filter(user=u).count(), 1)

    def test_dias_consecutivos_incrementan(self):
        u = _user()
        streak = _build_streak(u, 3)
        self.assertEqual(streak.racha_actual, 3)
        self.assertEqual(streak.mejor_racha, 3)
        self.assertEqual(streak.puntos_totales, 3 * streak_service.PUNTOS_POR_DIA)

    def test_un_dia_de_gracia_no_rompe(self):
        # gap de 1 día perdido pero regreso al siguiente: la racha continúa (romper
        # exige 2 días consecutivos sin actividad).
        u = _user()
        streak_service.record_study_activity(u, hoy=BASE)                       # d0
        streak_service.record_study_activity(u, hoy=BASE + timedelta(days=1))   # d1
        # se salta d2, vuelve d3
        streak = streak_service.record_study_activity(u, hoy=BASE + timedelta(days=3))
        self.assertEqual(streak.racha_actual, 3)

    def test_zona_horaria_fechas_locales_incrementan_a_traves_de_dst(self):
        # La lógica es por FECHA local (no datetime), así que un cambio de horario
        # de verano no afecta: días locales consecutivos siguen sumando.
        u = _user()
        dst = date(2026, 3, 7)  # alrededor del cambio de hora en EE. UU.
        for i in range(3):
            streak_service.record_study_activity(u, hoy=dst + timedelta(days=i))
        self.assertEqual(AcademyStreak.objects.get(user=u).racha_actual, 3)


# ─── Freeze ───────────────────────────────────────────────────────────────────

class FreezeTests(TestCase):
    def test_se_gana_un_freeze_cada_5_dias(self):
        u = _user()
        self.assertEqual(_build_streak(u, 4).freezes_disponibles, 0)
        u2 = _user('b@x.com')
        self.assertEqual(_build_streak(u2, 5).freezes_disponibles, 1)
        u3 = _user('c@x.com')
        self.assertEqual(_build_streak(u3, 10).freezes_disponibles, 2)

    def test_freeze_tope_maximo(self):
        u = _user()
        # 20 días consecutivos = 4 múltiplos de 5, pero el tope es 3.
        streak = _build_streak(u, 20)
        self.assertEqual(streak.freezes_disponibles, streak_service.MAX_FREEZES)

    def test_job_consume_freeze_si_falta_un_dia(self):
        u = _user()
        _build_streak(u, 5)  # racha 5, 1 freeze, última actividad = BASE+4
        # El alumno no estudia BASE+5; el job corre la mañana de BASE+6 (gap=2).
        resumen = streak_service.run_daily_maintenance(hoy=BASE + timedelta(days=6))
        streak = AcademyStreak.objects.get(user=u)
        self.assertEqual(resumen['freezes_consumidos'], 1)
        self.assertEqual(streak.freezes_disponibles, 0)
        self.assertEqual(streak.freezes_usados, 1)
        self.assertEqual(streak.racha_actual, 5)  # protegida
        self.assertEqual(streak.congelado_hasta, BASE + timedelta(days=5))

    def test_freeze_no_se_consume_si_hay_actividad(self):
        u = _user()
        _build_streak(u, 5)
        # Estudia BASE+5: última actividad al día → job del día siguiente no gasta nada.
        streak_service.record_study_activity(u, hoy=BASE + timedelta(days=5))
        resumen = streak_service.run_daily_maintenance(hoy=BASE + timedelta(days=6))
        streak = AcademyStreak.objects.get(user=u)
        self.assertEqual(resumen['freezes_consumidos'], 0)
        self.assertEqual(streak.freezes_disponibles, 1)
        self.assertEqual(streak.racha_actual, 6)


# ─── Ruptura y recuperación ───────────────────────────────────────────────────

class RupturaTests(TestCase):
    def test_rompe_tras_dos_dias_sin_freeze(self):
        u = _user()
        _build_streak(u, 3)  # racha 3, 0 freezes, última actividad = BASE+2
        # Día 1 sin actividad (job en BASE+4, gap=2): gracia, no rompe.
        streak_service.run_daily_maintenance(hoy=BASE + timedelta(days=4))
        self.assertEqual(AcademyStreak.objects.get(user=u).racha_actual, 3)
        # Día 2 sin actividad (job en BASE+5, gap=3): rompe.
        resumen = streak_service.run_daily_maintenance(hoy=BASE + timedelta(days=5))
        streak = AcademyStreak.objects.get(user=u)
        self.assertEqual(resumen['rotas'], 1)
        self.assertEqual(streak.racha_actual, 0)
        self.assertEqual(streak.racha_en_riesgo, 3)      # archivada para recuperar
        self.assertEqual(streak.mejor_racha, 3)          # el histórico no se borra
        self.assertIsNotNone(streak.recuperable_hasta)

    def test_recuperacion_dentro_de_ventana(self):
        u = _user()
        _build_streak(u, 3)
        streak_service.run_daily_maintenance(hoy=BASE + timedelta(days=4))
        streak_service.run_daily_maintenance(hoy=BASE + timedelta(days=5))
        streak = AcademyStreak.objects.get(user=u)
        dentro = streak.recuperable_hasta - timedelta(hours=1)
        # Vuelve a estudiar dentro de la ventana → revive la racha (3) + hoy = 4.
        streak = streak_service.record_study_activity(
            u, hoy=BASE + timedelta(days=5), ahora=dentro,
        )
        self.assertEqual(streak.racha_actual, 4)
        self.assertEqual(streak.racha_en_riesgo, 0)
        self.assertIsNone(streak.recuperable_hasta)

    def test_recuperacion_no_regala_freezes_de_mas(self):
        # Al recuperar una racha larga NO se re-otorgan los freezes que ya se habían
        # ganado durante la racha original.
        u = _user()
        _build_streak(u, 6)  # racha 6, 1 freeze, última actividad = BASE+5
        streak_service.run_daily_maintenance(hoy=BASE + timedelta(days=7))  # gasta el freeze
        streak_service.run_daily_maintenance(hoy=BASE + timedelta(days=8))  # gracia
        streak_service.run_daily_maintenance(hoy=BASE + timedelta(days=9))  # rompe
        streak = AcademyStreak.objects.get(user=u)
        self.assertEqual(streak.racha_en_riesgo, 6)
        self.assertEqual(streak.freezes_disponibles, 0)
        dentro = streak.recuperable_hasta - timedelta(hours=1)
        streak = streak_service.record_study_activity(
            u, hoy=BASE + timedelta(days=9), ahora=dentro,
        )
        self.assertEqual(streak.racha_actual, 7)      # 6 recuperada + hoy
        self.assertEqual(streak.freezes_disponibles, 0)  # NO se regala un freeze

    def test_recuperacion_fuera_de_ventana_empieza_de_cero(self):
        u = _user()
        _build_streak(u, 3)
        streak_service.run_daily_maintenance(hoy=BASE + timedelta(days=4))
        streak_service.run_daily_maintenance(hoy=BASE + timedelta(days=5))
        streak = AcademyStreak.objects.get(user=u)
        fuera = streak.recuperable_hasta + timedelta(hours=1)
        # Vuelve tarde: no recupera, arranca racha nueva de 1.
        streak = streak_service.record_study_activity(
            u, hoy=BASE + timedelta(days=8), ahora=fuera,
        )
        self.assertEqual(streak.racha_actual, 1)
        self.assertEqual(streak.racha_en_riesgo, 0)


# ─── Estado enriquecido (lo que consume la UI) ────────────────────────────────

class EstadoTests(TestCase):
    def test_estado_en_riesgo(self):
        u = _user()
        _build_streak(u, 3)  # última actividad = BASE+2
        # Hoy = BASE+4 (ayer, BASE+3, quedó sin cubrir) → en riesgo.
        st = streak_service.streak_state(
            AcademyStreak.objects.get(user=u), hoy=BASE + timedelta(days=4),
        )
        self.assertEqual(st['estado'], 'en_riesgo')
        self.assertTrue(st['en_riesgo'])
        self.assertIsNotNone(st['alerta'])

    def test_estado_recuperable(self):
        u = _user()
        _build_streak(u, 3)
        streak_service.run_daily_maintenance(hoy=BASE + timedelta(days=4))
        streak_service.run_daily_maintenance(hoy=BASE + timedelta(days=5))
        streak = AcademyStreak.objects.get(user=u)
        st = streak_service.streak_state(
            streak, hoy=BASE + timedelta(days=5),
            ahora=streak.recuperable_hasta - timedelta(hours=2),
        )
        self.assertEqual(st['estado'], 'recuperable')
        self.assertEqual(st['recuperacion']['racha_en_riesgo'], 3)

    def test_proximo_freeze_en(self):
        u = _user()
        _build_streak(u, 3)  # 3 días → faltan 2 para el freeze
        st = streak_service.streak_state(
            AcademyStreak.objects.get(user=u), hoy=BASE + timedelta(days=2),
        )
        self.assertEqual(st['proximo_freeze_en'], 2)


# ─── Resumen semanal (cohete de la Topbar) ────────────────────────────────────
# BASE es un lunes: facilita construir semanas exactas.

class ResumenSemanalTests(TestCase):
    def test_sin_actividad_ninguna_semana_activa(self):
        u = _user()
        streak, _ = AcademyStreak.objects.get_or_create(user=u)
        st = streak_service.streak_state(streak, hoy=BASE)
        self.assertEqual(st['semanal']['racha_semanas'], 0)
        self.assertTrue(all(not s['activa'] for s in st['semanal']['semanas']))
        self.assertEqual(st['semanal']['semanas'][-1]['numero'], 4)
        self.assertTrue(st['semanal']['semanas'][-1]['actual'])
        self.assertEqual(st['semanal']['alerta']['tipo'], 'iniciar')

    def test_actividad_hoy_cuenta_la_semana_actual(self):
        u = _user()
        streak_service.record_study_activity(u, hoy=BASE)
        st = streak_service.streak_state(AcademyStreak.objects.get(user=u), hoy=BASE)
        self.assertTrue(st['semanal']['semanas'][-1]['activa'])
        self.assertEqual(st['semanal']['racha_semanas'], 1)
        self.assertEqual(st['semanal']['alerta']['tipo'], 'en_curso')

    def test_semana_actual_sin_actividad_no_rompe_la_cuenta(self):
        u = _user()
        # 3 semanas consecutivas con actividad (una consecutiva, semanas 1-3);
        # la semana actual (4) todavía no tiene actividad — sigue en curso.
        for semanas_atras in (3, 2, 1):
            streak_service.record_study_activity(u, hoy=BASE - timedelta(weeks=semanas_atras))
        st = streak_service.streak_state(AcademyStreak.objects.get(user=u), hoy=BASE)
        self.assertFalse(st['semanal']['semanas'][-1]['activa'])
        self.assertEqual(st['semanal']['racha_semanas'], 3)

    def test_hueco_entre_semanas_corta_la_cuenta(self):
        u = _user()
        # Actividad hace 3 semanas y hoy, pero NO hace 2 ni 1 semanas: el hueco
        # corta la cuenta aunque hubo actividad más atrás.
        streak_service.record_study_activity(u, hoy=BASE - timedelta(weeks=3))
        streak_service.record_study_activity(u, hoy=BASE)
        st = streak_service.streak_state(AcademyStreak.objects.get(user=u), hoy=BASE)
        self.assertEqual(st['semanal']['racha_semanas'], 1)


# ─── Integración por endpoints (dispara sin llamada extra del frontend) ───────

class EndpointTests(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            username='ins@x.com', email='ins@x.com', password='x', academy_instructor=True,
        )
        self.student = _user('alu2@x.com')
        self.client = APIClient()
        self.course = Course.objects.create(
            instructor=self.instructor, titulo='C', slug='c', nivel='principiante', publicado=True,
        )
        m = Module.objects.create(course=self.course, orden=1, titulo='M1', es_gratuito=True)
        self.lesson = Lesson.objects.create(module=m, orden=1, titulo='L1', tipo='texto')
        ql = Lesson.objects.create(module=m, orden=2, titulo='Quiz', tipo='quiz')
        self.quiz = Quiz.objects.create(lesson=ql, puntaje_aprobacion=50)
        Question.objects.create(
            quiz=self.quiz, orden=1, tipo='opcion_unica', enunciado='¿?',
            opciones=[{'id': 'a', 'texto': 'A'}, {'id': 'b', 'texto': 'B'}],
            respuestas_correctas=['b'], puntos=1,
        )
        self.enrollment = Enrollment.objects.create(student=self.student, course=self.course)
        self.client.force_authenticate(self.student)

    def test_completar_leccion_dispara_racha_sin_llamada_extra(self):
        res = self.client.post(
            f'/api/academy/enrollments/{self.enrollment.id}/lessons/{self.lesson.id}/complete/'
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['racha_estudio'], 1)
        # La racha se creó y avanzó sin ningún endpoint "marcar actividad".
        self.assertEqual(AcademyStreak.objects.get(user=self.student).racha_actual, 1)

    def test_quiz_attempt_cuenta_como_actividad(self):
        res = self.client.post(
            f'/api/academy/enrollments/{self.enrollment.id}/quizzes/{self.quiz.id}/attempt/',
            {'respuestas': {str(self.quiz.preguntas.first().id): ['b']}}, format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['racha_estudio'], 1)
        self.assertTrue(AcademyActivityDay.objects.filter(user=self.student).exists())

    def test_header_local_date_atribuye_al_dia_del_cliente(self):
        # El header (dentro de ±1 día) fija el día LOCAL de la actividad.
        manana = (date.today() + timedelta(days=1)).isoformat()
        self.client.post(
            f'/api/academy/enrollments/{self.enrollment.id}/lessons/{self.lesson.id}/complete/',
            HTTP_X_LOCAL_DATE=manana,
        )
        dia = AcademyActivityDay.objects.get(user=self.student)
        self.assertEqual(dia.fecha.isoformat(), manana)

    def test_header_local_date_absurdo_cae_a_hoy(self):
        # Una fecha fuera del margen ±1 día se ignora (no se puede manipular la racha).
        self.client.post(
            f'/api/academy/enrollments/{self.enrollment.id}/lessons/{self.lesson.id}/complete/',
            HTTP_X_LOCAL_DATE='2000-01-01',
        )
        dia = AcademyActivityDay.objects.get(user=self.student)
        self.assertEqual(dia.fecha, date.today())

    def test_streak_endpoint_devuelve_estado(self):
        res = self.client.get('/api/academy/streak/')
        self.assertEqual(res.status_code, 200)
        for k in ('racha_actual', 'mejor_racha', 'freezes_disponibles', 'estado', 'alerta'):
            self.assertIn(k, res.data)


class SweepEndpointTests(TestCase):
    """POST /api/academy/streak/sweep/ — barrido diario disparado por cron externo."""

    def setUp(self):
        self.client = APIClient()

    @override_settings(CRON_SECRET='')
    def test_sin_secreto_configurado_503(self):
        res = self.client.post('/api/academy/streak/sweep/')
        self.assertEqual(res.status_code, 503)

    @override_settings(CRON_SECRET='s3cr3t')
    def test_secreto_incorrecto_403(self):
        res = self.client.post('/api/academy/streak/sweep/', HTTP_X_CRON_SECRET='malo')
        self.assertEqual(res.status_code, 403)

    @override_settings(CRON_SECRET='s3cr3t')
    def test_secreto_correcto_200(self):
        res = self.client.post('/api/academy/streak/sweep/', HTTP_X_CRON_SECRET='s3cr3t')
        self.assertEqual(res.status_code, 200)
        for k in ('evaluados', 'freezes_consumidos', 'rotas', 'sanas'):
            self.assertIn(k, res.data)
