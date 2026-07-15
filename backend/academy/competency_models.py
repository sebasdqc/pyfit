"""Grafo de competencias transversal a escuelas de Zyfit Academy.

Motor de aprendizaje adaptativo: la IA clasifica cada lección contra una
taxonomía CURADA de competencias (ver `seed_academy_competencies`), y el
dominio real del estudiante (evidencia de quizzes/entregas, `mastery_service`)
alimenta una recomendación de siguiente lección que puede cruzar escuelas —
a diferencia de `continuar`/`siguiente_paso` en `dashboard_service`, que es
puramente secuencial dentro del curso más recientemente tocado.

`Competency` es deliberadamente GLOBAL (sin `tenant`): es la taxonomía la que
permite detectar que un curso de nutrición y uno de recuperación comparten un
concepto subyacente, y scopearla por tenant fragmentaría ese cruce.
"""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from .models import Lesson


class Competency(models.Model):
    """Nodo del grafo de competencias. Curada a mano (ver comando de seed),
    nunca generada libremente por la IA de tagging — evita un grafo sucio con
    nombres inconsistentes por lección."""

    slug = models.SlugField(max_length=80, unique=True)
    nombre = models.CharField(max_length=120)
    descripcion = models.TextField(blank=True)
    orden = models.PositiveIntegerField(default=0)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_competencies'
        ordering = ['orden', 'nombre']
        verbose_name_plural = 'competencies'

    def __str__(self):
        return self.nombre


class LessonCompetencyTag(models.Model):
    """Etiqueta de una lección con una competencia del grafo, con peso de
    relevancia. `content_hash` es la firma del contenido de la LECCIÓN (no
    del tag) en el momento del tageo — se repite en los 1-3 tags de una misma
    lección a propósito, para que `tag_lesson_competencies` pueda decidir si
    hace falta re-tagear sin una tabla de estado aparte. Los tags con
    `fuente=FUENTE_MANUAL` nunca son tocados por ese comando."""

    FUENTE_IA = 'ia'
    FUENTE_MANUAL = 'manual'
    FUENTE_CHOICES = [(FUENTE_IA, 'IA'), (FUENTE_MANUAL, 'Manual')]

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='competencias')
    competency = models.ForeignKey(Competency, on_delete=models.CASCADE, related_name='lecciones')
    peso = models.FloatField(default=1.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    fuente = models.CharField(max_length=10, choices=FUENTE_CHOICES, default=FUENTE_IA)
    content_hash = models.CharField(max_length=64, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academy_lesson_competency_tags'
        unique_together = [['lesson', 'competency']]
        indexes = [models.Index(fields=['competency', 'lesson'])]

    def __str__(self):
        return f'{self.lesson_id} · {self.competency.slug} ({self.peso:.2f})'


class StudentCompetencyMastery(models.Model):
    """Dominio estimado de un estudiante sobre una competencia, actualizado
    por media móvil ponderada (EMA) a partir de evidencia real —ver
    `mastery_service.registrar_evidencia_quiz/submission`—, nunca calculado
    en el request path de lectura. `evidencia_n` es la cantidad de
    observaciones que alimentaron `nivel`, útil para no recomendar de forma
    agresiva sobre una sola observación ruidosa."""

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='academy_competency_mastery',
    )
    competency = models.ForeignKey(Competency, on_delete=models.CASCADE, related_name='+')
    nivel = models.FloatField(default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(100.0)])
    evidencia_n = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academy_student_competency_mastery'
        unique_together = [['student', 'competency']]
        indexes = [models.Index(fields=['student', 'nivel'])]
        verbose_name_plural = 'student competency mastery'

    def __str__(self):
        return f'{self.student_id} · {self.competency.slug} = {self.nivel:.1f}'
