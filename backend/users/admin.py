from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Profile, UserLocation, MenstrualCycle


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'is_active', 'date_joined']
    ordering = ['-date_joined']


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'user', 'nivel', 'racha_actual', 'puntos_totales', 'created_at']
    list_filter = ['nivel', 'sexo']
    search_fields = ['nombre', 'user__email']


@admin.register(UserLocation)
class UserLocationAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'user', 'tipo', 'created_at']
    list_filter = ['tipo']


admin.site.register(MenstrualCycle)
