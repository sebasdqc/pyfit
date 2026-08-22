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
    # Motor de running inteligente (espejo de ai_workout): ciencia + adaptación +
    # generación. Sus modelos de datos viven en la app 'runs'.
    'ai_running',
    # Ciencia/readiness/periodización SPORT-AGNOSTIC de deportes de resistencia
    # (running, y ciclismo cuando exista) — sin modelos propios, la usan
    # ai_running y en el futuro el motor de ciclismo. Ver endurance/science.py.
    'endurance',
    # Motor de ciclismo — Fase 2 del plan running+ciclismo: SOLO ciencia
    # (training_science_cycling.py), espejo del F0 de ai_running. Sin modelos
    # todavía (eso es Fase 3) ni endpoints. Ancla FC+RPE, potencia opcional.
    'ai_cycling',
    'devices',
    # Vertical B2B "Zyfit Performance" (panel web para centros deportivos).
    'performance',
    # Vertical e-learning "Zyfit Academy" (cursos en línea: web propia, próximamente).
    'academy',
    # Tutor IA de Zyfit Academy (RAG sobre el contenido de los cursos + Groq).
    'ai_tutor',
    # Códigos de descuento de influencers para Zyfit Pro (suscripción administrada).
    'promos',
    # Zyfit Score v2: motor de cálculo + persistencia (ScoreSnapshot/ScoreConfig),
    # espejo de ai_workout/ai_running (app de "inteligencia" sobre datos de otras apps).
    'scores',
    # Celery beat schedule almacenado en Django DB
    'django_celery_beat',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    # Resuelve el tenant de Academy por Host header → request.tenant.
    'academy.middleware.TenantMiddleware',
    # Resuelve el idioma de Academy (header X-Locale) → request.locale.
    'academy.middleware.LocaleMiddleware',
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

# Subida de medios (hoy: fotos de atletas del panel Performance).
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ── Object storage (DO Spaces / S3) — OPCIONAL, gateado por entorno ───────────
# Si no hay credenciales, USE_SPACES=False y las fotos siguen guardándose como
# hasta ahora (data URL base64 en la BD): desplegar este código NO cambia el
# comportamiento hasta que se configuren las variables SPACES_*.
SPACES_KEY = os.environ.get('SPACES_KEY', '').strip()
SPACES_SECRET = os.environ.get('SPACES_SECRET', '').strip()
SPACES_BUCKET = os.environ.get('SPACES_BUCKET', '').strip()
SPACES_REGION = os.environ.get('SPACES_REGION', 'nyc3').strip()
SPACES_ENDPOINT = os.environ.get(
    'SPACES_ENDPOINT', f'https://{SPACES_REGION}.digitaloceanspaces.com',
).strip()
USE_SPACES = bool(SPACES_KEY and SPACES_SECRET and SPACES_BUCKET)

# Django 5 usa el dict STORAGES (no STATICFILES_STORAGE/DEFAULT_FILE_STORAGE).
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}

if USE_SPACES:
    # django-storages (backend S3) apuntando al endpoint de DigitalOcean Spaces.
    AWS_ACCESS_KEY_ID = SPACES_KEY
    AWS_SECRET_ACCESS_KEY = SPACES_SECRET
    AWS_STORAGE_BUCKET_NAME = SPACES_BUCKET
    AWS_S3_REGION_NAME = SPACES_REGION
    AWS_S3_ENDPOINT_URL = SPACES_ENDPOINT
    AWS_DEFAULT_ACL = 'private'              # objetos privados → se sirven por URL firmada
    AWS_QUERYSTRING_AUTH = True              # .url devuelve URL firmada (caduca)
    AWS_QUERYSTRING_EXPIRE = int(os.environ.get('SPACES_URL_TTL', '3600'))
    AWS_S3_FILE_OVERWRITE = False
    AWS_LOCATION = os.environ.get('SPACES_LOCATION', 'media')
    AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
    STORAGES['default'] = {'BACKEND': 'storages.backends.s3.S3Storage'}

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
    # Backstop throttles applied to any endpoint that does not set throttle_classes
    # explicitly. Views with @throttle_classes(...) override these completely.
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    # NUM_PROXIES=1: use the rightmost IP in X-Forwarded-For (real client IP
    # from our single DO load-balancer), not the leftmost (attacker-controlled).
    'NUM_PROXIES': 1,
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',           # backstop para endpoints sin throttle explícito
        'user': '300/minute',          # backstop para endpoints autenticados
        'login': '10/minute',
        'register': '5/hour',
        'password_reset': '5/hour',
        'confirm_reset': '10/hour',    # brute-force guard: 6-digit PIN has 1M combos
        'verify_email': '10/hour',     # brute-force guard del PIN de verificación de email
        'resend_verification': '5/hour',  # evita flooding de emails de verificación
        'generate_session': '10/hour',
        'regenerar_ejercicio': '20/hour',
        'ajustar_sesion': '15/hour',   # cost guard: each call hits Groq API
        'generate_team_session': '20/hour',  # cost guard: Zyfit Performance, IA de sesión de equipo
        'coach_chat': '60/minute',     # anti-spam del chat coach↔atleta
        'support_chat': '60/minute',   # anti-spam del chat de soporte de Academy
        'coach_vincular': '20/hour',   # frena el barrido de códigos de coach
        'token_refresh': '20/minute',  # frena volcado masivo desde refresh token robado
        'session_resumen': '20/hour',  # cost guard: llama a Groq en cache-miss
        'impersonate': '5/hour',       # limita enumeración con token staff comprometido
        'exercise_catalog': '60/minute', # previene scraping masivo del catálogo público
        'ai_chat': '30/hour',          # cost guard: cada mensaje llama a Groq API
        'academy_tutor': '30/hour',    # cost guard horario del tutor (el límite diario por tier lo aplica TutorDailyUsage)
        'community_write': '30/hour',  # cost guard: crear post/respuesta puede llamar a Groq (moderación)
        'anon_session': '20/hour',     # evita creación masiva de AnonymousSession sin cuenta
        'simulador_compute': '30/minute',  # cost guard: listas grandes repetidas = riesgo de OOM
        'promo_validate': '20/hour',   # frena la enumeración de códigos de descuento
        'content_report': '10/day',    # reportes de contenido de IA — uso esporádico, no un canal de chat
        'change_password': '10/hour',  # frena brute-force de la contraseña actual con un JWT robado
        'change_email': '5/hour',      # evita flooding de emails de verificación a direcciones nuevas
        'confirm_email_change': '10/hour',  # brute-force guard: 6-digit PIN has 1M combos
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Headers CORS permitidos. Incluye X-Tenant-Slug que envían los frontends
# multi-site de Academy para resolver el tenant sin necesitar dominio propio.
# Lista hardcodeada para evitar imports de corsheaders en settings (incompatible
# con django-cors-headers 4.x donde corsheaders.defaults fue eliminado).
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-tenant-slug',
    # Enviados por academy-web en CADA request (racha de estudio, onboarding
    # anónimo e idioma) — sin listar acá, el navegador bloquea el preflight
    # CORS y la request nunca llega al servidor (se ve como "no se pudo
    # conectar", no como un error de credenciales).
    'x-local-date',
    'x-anon-session',
    'x-locale',
]

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        'CORS_ALLOWED_ORIGINS',
        # 3000 landing Next.js · 8081 Expo · 5180 panel Zyfit Performance
        'http://localhost:3000,http://localhost:8081,http://localhost:5180',
    ).split(',')
    if o.strip()
]
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL', 'False') == 'True'

# Orígenes permitidos por expresión regular (además de la lista exacta de
# arriba). Útil para el panel Zyfit Performance desplegado como Static Site en
# DO: su URL autogenerada (p. ej. zyfit-performance-xxxxx.ondigitalocean.app) no
# se conoce antes del primer deploy, así que se permite con un regex en vez de
# tener que fijar el subdominio exacto. Vacío por defecto.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r.strip()
    for r in os.environ.get('CORS_ALLOWED_ORIGIN_REGEXES', '').split(',')
    if r.strip()
]

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

# ─── Proveedor LLM (DeepSeek, OpenAI-compatible) ───────────────────────────────
# Migrado de Groq a DeepSeek: la API es OpenAI-compatible, se usa el SDK `openai`
# con base_url propia. Cliente central en pyfit/llm.py; el modelo se pasa como
# settings.LLM_MODEL en cada llamada. Usado por la generación de rutinas/running,
# el chat del coach, el tutor IA y la moderación/traducción de Academy.
LLM_API_KEY  = os.environ.get('DEEPSEEK_API_KEY', '')
LLM_BASE_URL = os.environ.get('LLM_BASE_URL', 'https://api.deepseek.com')
LLM_MODEL    = os.environ.get('LLM_MODEL', 'deepseek-chat')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# ─── Tutor IA de Zyfit Academy ─────────────────────────────────────────────────
# Modelo de embeddings LOCAL (sentence-transformers) para el RAG del tutor. Los
# vectores se guardan como JSON en TutorChunk y la búsqueda es coseno en proceso
# (corpus pequeño y estático → sin pgvector). Configurable por entorno.
TUTOR_EMBEDDING_MODEL = os.environ.get(
    'TUTOR_EMBEDDING_MODEL',
    'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
)

# Secreto compartido para disparar jobs vía HTTP desde un cron externo (GitHub
# Actions). Vacío = endpoints de cron deshabilitados (503). Ver academy.views.streak_sweep.
CRON_SECRET = os.environ.get('CRON_SECRET', '')

# Cantidad de reportes de alumnos que oculta automáticamente un post/respuesta
# de la Comunidad (sin intervención humana). Ver academy.community_service.
COMMUNITY_REPORT_THRESHOLD = int(os.environ.get('COMMUNITY_REPORT_THRESHOLD', '3'))

# Secreto compartido para el webhook de pagos de "Zyfit Academy Pro" (cabecera
# X-Academy-Payment-Secret). Vacío = webhook deshabilitado (503). Sin proveedor
# de pago real confirmado todavía — ver academy.payments/academy.subscription_views.
ACADEMY_PAYMENT_WEBHOOK_SECRET = os.environ.get('ACADEMY_PAYMENT_WEBHOOK_SECRET', '')

# ─── Google Sign-In ───────────────────────────────────────────────────────────
# Audiencias (client IDs) aceptadas al verificar el id_token de Google que envía
# la app. Debe incluir el **Web client ID** (que la SDK nativa usa como
# `webClientId` y que firma el `idToken`) y, por seguridad, también se pueden
# listar el iOS/Android client ID. Coma-separado, p. ej.:
#   GOOGLE_OAUTH_CLIENT_IDS=1234-web.apps.googleusercontent.com,5678-ios.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_IDS = [
    c.strip() for c in os.environ.get('GOOGLE_OAUTH_CLIENT_IDS', '').split(',') if c.strip()
]

# ─── Apple Sign-In ────────────────────────────────────────────────────────────
# Audiencia esperada del identity_token: el bundle ID de la app iOS
# (mobile/app.json → ios.bundleIdentifier). No requiere secreto — la firma se
# verifica contra el JWKS público de Apple (ver users/views.py:_verify_apple_identity_token).
APPLE_SIGNIN_BUNDLE_ID = os.environ.get('APPLE_SIGNIN_BUNDLE_ID', 'app.pyfit.mobile')

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
        """Scrub liviano de campos sensibles antes de enviar a Sentry."""
        try:
            req = event.get('request') or {}
            # Scrub headers con credenciales
            headers = req.get('headers') or {}
            for field in ('Authorization', 'Cookie'):
                if field in headers:
                    headers[field] = '[scrubbed]'
            # Scrub body de endpoints de auth — password e id_token nunca
            # deben aparecer en Sentry aunque se capture una excepción en login.
            data = req.get('data') or {}
            if isinstance(data, dict):
                for field in ('password', 'id_token', 'token', 'refresh'):
                    if field in data:
                        data[field] = '[scrubbed]'
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
                'title':     'Academia',
                'separator': True,
                'items': [
                    {'title': 'Cursos',        'icon': 'school',        'link': reverse_lazy('admin:academy_course_changelist')},
                    {'title': 'Matrículas',    'icon': 'how_to_reg',    'link': reverse_lazy('admin:academy_enrollment_changelist')},
                    {'title': 'Certificados',  'icon': 'workspace_premium', 'link': reverse_lazy('admin:academy_certificate_changelist')},
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
