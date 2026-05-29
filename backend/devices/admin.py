from django.contrib import admin
from unfold.admin import ModelAdmin
from devices.models import DeviceIntegration


@admin.register(DeviceIntegration)
class DeviceIntegrationAdmin(ModelAdmin):
    list_display  = ('user', 'device', 'status', 'last_synced_at', 'hrv', 'sleep_score', 'body_battery', 'updated_at')
    list_filter   = ('device', 'status')
    search_fields = ('user__email',)
    readonly_fields = (
        'created_at', 'updated_at', 'last_synced_at',
        'hrv', 'sleep_score', 'resting_hr', 'stress_level', 'body_battery',
        # Los tokens nunca se muestran en admin
        'access_token', 'refresh_token', 'token_expires_at',
    )
    fields = (
        'user', 'device', 'status',
        'last_synced_at',
        'hrv', 'sleep_score', 'resting_hr', 'stress_level', 'body_battery',
        'token_expires_at',
        'created_at', 'updated_at',
    )
    ordering = ('-updated_at',)
