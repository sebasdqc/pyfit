"""Admin del Tutor de Academy — solo lectura/diagnóstico (no se audita con auditlog).

Útil para inspeccionar el índice del RAG y el uso/feedback sin exponer datos de
conversación a edición accidental.
"""

from django.contrib import admin

from .models import TutorChunk, TutorConversation, TutorMessage, TutorDailyUsage


@admin.register(TutorChunk)
class TutorChunkAdmin(admin.ModelAdmin):
    list_display = ('curso_slug', 'modulo_titulo', 'leccion_titulo', 'chunk_index', 'embedding_model', 'updated_at')
    list_filter = ('curso_slug', 'escuela_slug', 'embedding_model')
    search_fields = ('curso_titulo', 'leccion_titulo', 'contenido')
    readonly_fields = ('embedding', 'content_hash', 'updated_at')


@admin.register(TutorConversation)
class TutorConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'titulo', 'updated_at')
    search_fields = ('titulo', 'user__email')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TutorMessage)
class TutorMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'role', 'redirigido', 'feedback', 'tokens_out', 'created_at')
    list_filter = ('role', 'redirigido', 'feedback')
    readonly_fields = ('created_at',)


@admin.register(TutorDailyUsage)
class TutorDailyUsageAdmin(admin.ModelAdmin):
    list_display = ('user', 'fecha', 'count', 'tokens_in', 'tokens_out')
    list_filter = ('fecha',)
    search_fields = ('user__email',)
