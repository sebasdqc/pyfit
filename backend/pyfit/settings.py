from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured
from django.urls import reverse_lazy
import dj_database_url

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.environ.get('DEBUG', 'False') == 'True'

SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-dev-key-change-in-production'
    else:
        raise ImproperlyConfigured(
            'SECRET_KEY environment variable is required when DEBUG=False'
        )

_allowed = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1')
_allowed_list = [h.strip() for h in _allowed.split(',') if h.strip()]
if not _allowed_list:
    if DEBUG:
        _allowed_list = ['*']
    else:
        raise ImproperlyConfigured(
            'ALLOWED_HOSTS must not be empty when DEBUG=False. '
            'Falling back to ["*"] in production would allow host header injection.'
        )
ALLOWED_HOSTS = _allowed_list

INSTALLED_APPS = [
    # django-unfold replaces the default admin look — must be listed BEFORE
    # the admin app so its templates win.
    'unfold',
    'unfold.contrib.filters',
    'unfold.contrib.forms',
    # Reemplaza el admin por defecto con nuestro ZyfitAdminSite (que exige 2FA
    # cuando el staff tiene dispositivo TOTP confirmado).
    'pyfit.admin_app.ZyfitAdminConfig',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # 2FA (django-otp): núcleo + TOTP + static tokens de respaldo.
    'django_otp',
    'django_otp.plugins.otp_totp',
    'django_otp.plugins.otp_static',
    # Audit log de cambios sobre modelos críticos.
    'auditlog',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'users',
    'workouts',
    'checkins',
    'ai_workout',
    'runs',
    'devices',
    # Celery beat schedule almacenado en Django DB
    'django_celery_beat',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    # Inyecta `is_verified()` en el request.user para que el admin pueda decidir.
    # Debe ir después de AuthenticationMiddleware.
    'django_otp.middleware.OTPMiddleware',
    # Forza 2FA en URLs del admin cuando el usuario tiene dispositivo confirmado.
    # Debe ir DESPUÉS de OTPMiddleware.
    'pyfit.admin_security.OTPRequiredForAdminMiddleware',
    # Asocia cada operación de log con el usuario y la IP del request actual.
    'auditlog.middleware.AuditlogMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'pyfit.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'pyfit.wsgi.application'

DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {'default': dj_database_url.parse(DATABASE_URL)}
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es-es'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'users.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'EXCEPTION_HANDLER': 'pyfit.exceptions.json_exception_handler',
    'DEFAULT_THROTTLE_RATES': {
        'login': '10/minute',
        'register': '5/hour',
        'password_reset': '5/hour',
        'confirm_reset': '10/hour',    # brute-force guard: 6-digit PIN has 1M combos
        'generate_session': '10/hour',
        'regenerar_ejercicio': '20/hour',
        'ajustar_sesion': '15/hour',   # cost guard: each call hits Groq API
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:3000,http://localhost:8081',
    ).split(',')
    if o.strip()
]
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL', 'False') == 'True'

# Safety: never allow wide-open CORS in production. If someone flips the flag
# accidentally, fail loudly instead of leaking the API.
if CORS_ALLOW_ALL_ORIGINS and not DEBUG:
    raise ImproperlyConfigured(
        'CORS_ALLOW_ALL cannot be True when DEBUG=False'
    )

# When deployed behind a TLS terminator (DigitalOcean), trust the X-Forwarded-Proto
# header so Django generates https URLs for password-reset emails, etc.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER     = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE       = True
    CSRF_COOKIE_SECURE          = True
    # Cualquier petición HTTP es redirigida a HTTPS (DO no lo hace por nosotros
    # a nivel de ingress; el ALB sólo termina TLS).
    SECURE_SSL_REDIRECT         = True
    # HSTS — el navegador recordará que este dominio es solo-HTTPS durante 1 año.
    # No habilitamos preload por ahora; activar tras verificar que NUNCA volvemos
    # a servir HTTP plano en ningún subdominio del producto.
    SECURE_HSTS_SECONDS         = 31_536_000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD         = False
    # Hardening adicional sin coste.
    SECURE_REFERRER_POLICY      = 'same-origin'
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER   = True
    X_FRAME_OPTIONS             = 'DENY'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('EMAIL_HOST_USER', 'noreply@pyfit.app')

GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# ─── Garmin Connect OAuth 2.0 ─────────────────────────────────────────────────
GARMIN_CLIENT_ID     = os.environ.get('GARMIN_CLIENT_ID', '')
GARMIN_CLIENT_SECRET = os.environ.get('GARMIN_CLIENT_SECRET', '')
GARMIN_OAUTH_BASE_URL = os.environ.get(
    'GARMIN_OAUTH_BASE_URL',
    'https://connect.garmin.com',
)
GARMIN_API_BASE_URL  = os.environ.get(
    'GARMIN_API_BASE_URL',
    'https://apis.garmin.com',
)
GARMIN_REDIRECT_URI  = os.environ.get('GARMIN_REDIRECT_URI', 'zyfit://garmin/callback')

# ─── django-cryptography — clave de encriptación de campos ───────────────────
# Generar con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
FIELD_ENCRYPTION_KEY = os.environ.get('FIELD_ENCRYPTION_KEY', '')
# Solo es obligatoria cuando Garmin está configurado (GARMIN_CLIENT_ID presente):
# sus tokens OAuth se guardan encriptados. Sin Garmin activo no se almacenan tokens,
# así que NO debe bloquear el build (collectstatic) ni el arranque. Apple Health no
# usa tokens server-side. Al activar Garmin, el requisito de la key se reactiva.
if GARMIN_CLIENT_ID and not FIELD_ENCRYPTION_KEY and not DEBUG:
    raise ImproperlyConfigured(
        'FIELD_ENCRYPTION_KEY is required when Garmin is enabled (GARMIN_CLIENT_ID set) '
        'to encrypt OAuth tokens. Generate one with: '
        'python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'
    )

# ─── Celery (broker: Redis) ───────────────────────────────────────────────────
CELERY_BROKER_URL        = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND    = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT    = ['json']
CELERY_TASK_SERIALIZER   = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE          = 'UTC'
# No almacenar resultados de tasks que no los necesitan (reduce Redis memory)
CELERY_TASK_IGNORE_RESULT = True
# En desarrollo sin Redis, usar always_eager para ejecutar tasks inline
CELERY_TASK_ALWAYS_EAGER = DEBUG and not os.environ.get('REDIS_URL')

# ─── Sentry (observabilidad de errores en producción) ─────────────────────────
SENTRY_DSN = os.environ.get('SENTRY_DSN', '').strip()
if SENTRY_DSN:
    import logging as _logging
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration

    def _sentry_before_send(event, hint):
        """Scrub liviano. Sentry ya tiene defaults razonables, pero esto
        elimina algunos campos sensibles que aparecen frecuente en PyFit:
        - JWT tokens en headers de request
        - emails (PII)
        """
        try:
            req = event.get('request') or {}
            headers = req.get('headers') or {}
            if 'Authorization' in headers:
                headers['Authorization'] = '[scrubbed]'
            if 'Cookie' in headers:
                headers['Cookie'] = '[scrubbed]'
        except Exception:
            pass
        return event

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(
                transaction_style='url',
                middleware_spans=True,
                signals_spans=False,
                cache_spans=False,
            ),
            LoggingIntegration(
                level=_logging.INFO,         # logs INFO+ como breadcrumbs
                event_level=_logging.ERROR,  # logs ERROR+ se envían como eventos
            ),
        ],
        # Traces sample: 10% en prod, 100% en dev. Profiles desactivado para
        # mantener el plan free de Sentry tranquilo hasta que veamos volumen real.
        traces_sample_rate=1.0 if DEBUG else 0.1,
        profiles_sample_rate=0.0,
        # send_default_pii=False evita enviar IPs / emails / cookies por defecto.
        # Los scrubeamos manualmente igual en before_send.
        send_default_pii=False,
        environment=os.environ.get('SENTRY_ENVIRONMENT', 'development' if DEBUG else 'production'),
        release=os.environ.get('SENTRY_RELEASE') or None,
        before_send=_sentry_before_send,
        # No reportar errores generados por bots probando rutas inexistentes.
        ignore_errors=[
            'django.http.Http404',
            'django.core.exceptions.SuspiciousOperation',
            'rest_framework.exceptions.NotAuthenticated',
            'rest_framework.exceptions.AuthenticationFailed',
            'rest_framework.exceptions.PermissionDenied',
            'rest_framework.exceptions.Throttled',
        ],
    )

# ─── django-otp ───────────────────────────────────────────────────────────────
# El nombre que aparece en Authenticator/Authy junto a la cuenta.
OTP_TOTP_ISSUER = 'Zyfit Control'

# ─── django-auditlog ──────────────────────────────────────────────────────────
# Capturar la IP detrás del proxy de DigitalOcean.
AUDITLOG_CID_HEADER = 'X-Request-ID'
AUDITLOG_DISABLE_REMOTE_ADDR = False

# ─── django-unfold (Zyfit admin theme) ────────────────────────────────────────
# Branding + navegación. La paleta de `primary` es la del producto (#4f8cff).
# Tailwind expone los tonos como RGB triplets separados por espacios.
UNFOLD = {
    'SITE_TITLE':   'Zyfit Control',
    'SITE_HEADER':  'Zyfit Control',
    'SITE_URL':     None,           # Hide "View site" — Zyfit user app is mobile
    'SITE_SYMBOL':  'monitoring',   # Material Symbols icon used in header
    'SHOW_HISTORY': True,
    'SHOW_VIEW_ON_SITE': False,
    'THEME': 'dark',                # Force dark to match Zyfit identity
    'DASHBOARD_CALLBACK': 'pyfit.admin_metrics.dashboard_callback',
    'COLORS': {
        'primary': {
            '50':  '239 246 255',
            '100': '219 234 254',
            '200': '191 219 254',
            '300': '147 197 253',
            '400': '122 182 255',    # Zyfit accentLight (#7ab6ff)
            '500': '79 140 255',     # Zyfit accent       (#4f8cff)
            '600': '37 99 255',      # Zyfit accentDark   (#2563ff)
            '700': '29 78 216',
            '800': '30 64 175',
            '900': '30 58 138',
            '950': '23 37 84',
        },
    },
    'SIDEBAR': {
        'show_search': True,
        'show_all_applications': False,
        # Los `link` deben ser URLs ya resueltas (no strings de URL names).
        # Unfold no llama `reverse()` sobre strings — los toma como href literal,
        # y Safari interpreta `admin:index` como protocolo (igual que `mailto:`).
        'navigation': [
            {
                'title':     'Operación',
                'separator': True,
                'items': [
                    {'title': 'Dashboard',   'icon': 'dashboard',      'link': reverse_lazy('admin:index')},
                    {'title': 'Métricas',    'icon': 'monitoring',     'link': reverse_lazy('zyfit_metrics')},
                    {'title': 'Exportar',    'icon': 'download',       'link': reverse_lazy('zyfit_export_hub')},
                    {'title': 'Broadcast',   'icon': 'campaign',       'link': reverse_lazy('zyfit_broadcast')},
                ],
            },
            {
                'title':     'Personas',
                'separator': True,
                'items': [
                    {'title': 'Usuarios',    'icon': 'group',                'link': reverse_lazy('admin:users_user_changelist')},
                    {'title': 'Perfiles',    'icon': 'badge',                'link': reverse_lazy('admin:users_profile_changelist')},
                    {'title': 'Ubicaciones', 'icon': 'place',                'link': reverse_lazy('admin:users_userlocation_changelist')},
                    {'title': 'Lesiones',    'icon': 'medical_information',  'link': reverse_lazy('admin:users_userinjury_changelist')},
                ],
            },
            {
                'title':     'Entrenamiento',
                'separator': True,
                'items': [
                    {'title': 'Sesiones',      'icon': 'fitness_center', 'link': reverse_lazy('admin:workouts_session_changelist')},
                    {'title': 'Check-ins',     'icon': 'mood',           'link': reverse_lazy('admin:checkins_dailycheckin_changelist')},
                    {'title': 'Feedback',      'icon': 'star',           'link': reverse_lazy('admin:workouts_sessionfeedback_changelist')},
                    {'title': 'Competiciones', 'icon': 'emoji_events',   'link': reverse_lazy('admin:workouts_competition_changelist')},
                ],
            },
            {
                'title':     'Dispositivos',
                'separator': True,
                'items': [
                    {'title': 'Integraciones', 'icon': 'watch', 'link': reverse_lazy('admin:devices_deviceintegration_changelist')},
                ],
            },
            {
                'title':     'Notificaciones',
                'separator': True,
                'items': [
                    {'title': 'Bandeja',      'icon': 'notifications', 'link': reverse_lazy('admin:users_notification_changelist')},
                    {'title': 'Preferencias', 'icon': 'tune',          'link': reverse_lazy('admin:users_notificationpreference_changelist')},
                ],
            },
            {
                'title':     'Seguridad',
                'separator': True,
                'items': [
                    {'title': 'Audit log',     'icon': 'history',        'link': reverse_lazy('admin:auditlog_logentry_changelist')},
                    {'title': 'Impersonaciones', 'icon': 'switch_account', 'link': reverse_lazy('admin:users_impersonationlog_changelist')},
                    {'title': 'TOTP devices',  'icon': 'phonelink_lock', 'link': reverse_lazy('admin:otp_totp_totpdevice_changelist')},
                    {'title': 'Backup tokens', 'icon': 'vpn_key',        'link': reverse_lazy('admin:otp_static_staticdevice_changelist')},
                ],
            },
        ],
    },
}
