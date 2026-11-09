"""El seed de contenido NO debe destruir datos que ya viven en producción:
medios cargados a mano y contenido que ya no está en el .md."""

import tempfile
from io import StringIO
from pathlib import Path
from unittest import mock

from django.core.management import call_command
from django.test import TestCase

from academy.models import Course, Lesson, Module, Question
from academy.tests._fixtures import make_user

MD = """# Curso Seguro

## Módulo 1: Uno

### Lección 1 — Video de bienvenida (tipo: video)

Guion de la lección.

### Lección 2 — Quiz (tipo: quiz)

#### Pregunta 1 (tipo: opcion_unica, puntos: 1)
¿Cuál?
- [a] Una
- [b] Otra ✓
"""


class SeedSafetyTests(TestCase):
    def setUp(self):
        instructor = make_user('ins@x.com', academy_instructor=True)
        self.course = Course.objects.create(
            instructor=instructor, titulo='Seguro', slug='curso-seguro', descripcion='d', publicado=True,
        )
        self.tmp = tempfile.TemporaryDirectory()
        (Path(self.tmp.name) / 'curso-seguro.md').write_text(MD, encoding='utf-8')
        patcher = mock.patch(
            'academy.management.commands.seed_course_content.CONTENT_DIR', Path(self.tmp.name),
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(self.tmp.cleanup)

    def seed(self, *args):
        out = StringIO()
        call_command('seed_course_content', *args, stdout=out, stderr=StringIO())
        return out.getvalue()

    def test_un_md_sin_url_no_borra_el_video_cargado_a_mano(self):
        self.seed()
        lesson = Lesson.objects.get(module__course=self.course, orden=1)
        lesson.video_url = 'https://cdn.ejemplo.com/video.mp4'
        lesson.subtitulos_url = 'https://cdn.ejemplo.com/video.vtt'
        lesson.save()
        self.seed()
        lesson.refresh_from_db()
        self.assertEqual(lesson.video_url, 'https://cdn.ejemplo.com/video.mp4')
        self.assertEqual(lesson.subtitulos_url, 'https://cdn.ejemplo.com/video.vtt')

    def test_el_md_con_url_real_si_actualiza(self):
        self.seed()
        md = MD.replace('Guion de la lección.', 'video_url: https://cdn.ejemplo.com/nuevo.mp4\nsubtitulos_url: https://cdn.ejemplo.com/nuevo.vtt\n\nGuion de la lección.')
        (Path(self.tmp.name) / 'curso-seguro.md').write_text(md, encoding='utf-8')
        self.seed()
        lesson = Lesson.objects.get(module__course=self.course, orden=1)
        self.assertEqual(lesson.video_url, 'https://cdn.ejemplo.com/nuevo.mp4')
        self.assertEqual(lesson.subtitulos_url, 'https://cdn.ejemplo.com/nuevo.vtt')

    def test_por_defecto_no_borra_lo_que_ya_no_esta_en_el_md(self):
        self.seed()
        modulo = Module.objects.get(course=self.course)
        extra = Lesson.objects.create(module=modulo, orden=9, titulo='Solo en la BD', tipo='texto')
        quiz_q = Question.objects.get(quiz__lesson__module=modulo)
        Question.objects.create(quiz=quiz_q.quiz, orden=9, enunciado='Extra', opciones=[], respuestas_correctas=[])
        Module.objects.create(course=self.course, orden=7, titulo='Módulo huérfano')

        salida = self.seed()
        self.assertTrue(Lesson.objects.filter(pk=extra.pk).exists())
        self.assertTrue(Question.objects.filter(enunciado='Extra').exists())
        self.assertTrue(Module.objects.filter(orden=7).exists())
        self.assertIn('solo en la BD', salida)
        self.assertIn('usa --prune', salida)

    def test_prune_si_elimina(self):
        self.seed()
        modulo = Module.objects.get(course=self.course)
        extra = Lesson.objects.create(module=modulo, orden=9, titulo='Solo en la BD', tipo='texto')
        Module.objects.create(course=self.course, orden=7, titulo='Módulo huérfano')
        self.seed('--prune')
        self.assertFalse(Lesson.objects.filter(pk=extra.pk).exists())
        self.assertFalse(Module.objects.filter(orden=7).exists())

    def test_dry_run_reporta_sin_escribir(self):
        modulo = Module.objects.create(course=self.course, orden=7, titulo='Módulo huérfano')
        salida = self.seed('--dry-run', '--prune')
        self.assertTrue(Module.objects.filter(pk=modulo.pk).exists())
        self.assertFalse(Lesson.objects.filter(module__course=self.course, orden=1).exists())
        self.assertIn('Módulo huérfano', salida)
