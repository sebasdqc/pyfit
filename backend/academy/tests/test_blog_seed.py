"""El seed del blog debe poder correr en producción sin sorpresas: respeta los
límites de los campos del modelo, es idempotente y no trae voseo (la voz del
copy es español neutro, tratamiento de "tú")."""

import re
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from academy.blog_models import BlogPost
from academy.management.commands.seed_blog_posts import POSTS

VOSEO = re.compile(
    r'\b(Seguí|querés|podés|tenés|sabés|elegí|andá|fijate|mirá|probá|empezá|'
    r'Descubrí|Conocé|contanos|hacé|vos)\b',
    re.IGNORECASE,
)


class BlogSeedTests(TestCase):
    def _seed(self):
        call_command('seed_blog_posts', stdout=StringIO())

    def test_siembra_todos_los_posts_y_es_idempotente(self):
        self._seed()
        self.assertEqual(BlogPost.objects.count(), len(POSTS))
        self._seed()
        self.assertEqual(BlogPost.objects.count(), len(POSTS))
        self.assertFalse(BlogPost.objects.filter(publicado=False).exists())

    def test_los_campos_respetan_los_limites_del_modelo(self):
        self._seed()
        for post in BlogPost.objects.all():
            # full_clean valida max_length de titulo/slug/resumen/meta_*.
            post.full_clean()

    def test_sin_voseo_en_el_contenido(self):
        for data in POSTS:
            texto = ' '.join(str(v) for v in data.values())
            self.assertIsNone(VOSEO.search(texto), data['titulo'])

    def test_el_cta_apunta_al_curso_cuando_existe_o_cae_a_explorar(self):
        self._seed()
        for post in BlogPost.objects.all():
            self.assertNotIn('__CURSO_ID__', post.contenido, post.slug)
