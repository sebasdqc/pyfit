"""Soporte de Zyfit Academy: FAQ estática + chat estudiante↔staff.

Modelos en archivo propio, mismo criterio que `library_models.py`/
`blog_models.py` (no seguir engordando `models.py`).

`SupportFAQ` sigue el patrón de `LibraryResource`: catálogo administrado por
staff vía Django Admin, sin autoría de instructor.

`SupportMessage` es una tabla PLANA de mensajes, mismo patrón que
`CoachMessage` (backend/users/models.py) para el chat coach↔atleta — pero a
diferencia de ese caso, acá no existe un vínculo previo (`CoachAthlete`): el
FK directo es el propio estudiante, y CUALQUIER admin de Academy puede abrir
y responder el hilo de cualquier estudiante de su organización (no hay
"asignación" de conversaciones a un admin en particular).
"""

from django.conf import settings
from django.db import models


class SupportFAQ(models.Model):
    tenant = models.ForeignKey(
        'academy.Tenant', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='faqs_soporte',
    )
    pregunta = models.CharField(max_length=300)
    respuesta = models.TextField()
    # Traducción al inglés (ver nota en School.nombre_en, models.py).
    pregunta_en = models.CharField(max_length=300, blank=True, default='')
    respuesta_en = models.TextField(blank=True, default='')
    categoria = models.CharField(max_length=80, blank=True)
    orden = models.PositiveIntegerField(default=0)
    publicado = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academy_support_faqs'
        ordering = ['orden', 'id']
        indexes = [models.Index(fields=['tenant', 'publicado'])]

    def __str__(self):
        return self.pregunta


class SupportMessage(models.Model):
    """Mensaje del chat de soporte. `from_admin` distingue el lado que lo
    envió (True = staff, False = estudiante), igual que `CoachMessage.
    from_coach`. `admin` es solo informativo (quién respondió) — SET_NULL
    para no perder el historial si esa cuenta se borra."""

    tenant = models.ForeignKey(
        'academy.Tenant', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='mensajes_soporte',
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mensajes_soporte',
    )
    from_admin = models.BooleanField(default=False)
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='respuestas_soporte',
    )
    texto = models.TextField()
    leido = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academy_support_messages'
        ordering = ['created_at']
        indexes = [models.Index(fields=['tenant', 'student', 'created_at'])]

    def __str__(self):
        return f'{"admin" if self.from_admin else "estudiante"}: {self.texto[:30]}'
