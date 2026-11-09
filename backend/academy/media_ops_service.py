"""Producción de medios: qué lecciones de video y audio siguen sin archivo.

Casi la mitad de las lecciones de Academy son de video o audio y nacieron solo
con su guion. Este reporte convierte esa deuda en una cola de trabajo: por
curso, cuántas faltan y, de cada una, el largo del guion (que sirve de
transcripción y para estimar la duración a grabar).
"""

import re
from collections import OrderedDict

from .models import Lesson

PALABRAS_POR_MINUTO = 150  # ritmo de locución típico en español


def _palabras(texto):
    return len(re.findall(r'\w+', texto or ''))


def build_media_report(tenant):
    lecciones = (
        Lesson.objects.filter(
            module__course__tenant=tenant, module__course__publicado=True,
            tipo__in=('video', 'audio'),
        )
        .select_related('module__course')
        .order_by('module__course__titulo', 'module__orden', 'orden')
    )
    cursos = OrderedDict()
    total = con_medio = con_subtitulos = minutos_pendientes = 0
    for l in lecciones:
        c = l.module.course
        fila = cursos.setdefault(c.id, {
            'course_id': c.id, 'curso': c.titulo, 'total': 0, 'con_medio': 0,
            'con_subtitulos': 0, 'pendientes': [],
        })
        tiene = bool(l.video_url)
        fila['total'] += 1
        total += 1
        if tiene:
            fila['con_medio'] += 1
            con_medio += 1
            if l.subtitulos_url:
                fila['con_subtitulos'] += 1
                con_subtitulos += 1
        else:
            palabras = _palabras(l.contenido)
            minutos = max(round(palabras / PALABRAS_POR_MINUTO), 1) if palabras else 0
            minutos_pendientes += minutos
            fila['pendientes'].append({
                'lesson_id': l.id, 'modulo': l.module.titulo, 'titulo': l.titulo, 'tipo': l.tipo,
                'guion_palabras': palabras, 'minutos_estimados': minutos,
            })
    return {
        'total': total,
        'con_medio': con_medio,
        'pendientes': total - con_medio,
        'con_subtitulos': con_subtitulos,
        'minutos_por_grabar': minutos_pendientes,
        'avance': round(con_medio * 100 / total) if total else 0,
        'cursos': list(cursos.values()),
    }
