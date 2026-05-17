"""2FA para Zyfit Control vía middleware + vista de verificación.

Por qué no usamos OTPAdminSite directamente: django-unfold reemplaza
`admin.site` con su propia instancia, así que el approach de subclase deja de
funcionar. En su lugar:

1. Las apps `django_otp.plugins.otp_totp` y `otp_static` añaden modelos
   gestionables desde el admin para que el staff enrole su dispositivo.
2. `OTPMiddleware` (de django-otp) inyecta `request.user.is_verified()` en
   cada request.
3. `OTPRequiredForAdminMiddleware` intercepta las URLs del admin: si el
   usuario tiene un TOTPDevice CONFIRMADO pero la sesión no está OTP-verificada,
   lo manda a `/<ADMIN_URL>/otp-verify/`.
4. `otp_verify_view` muestra un formulario simple para el código de 6 dígitos.
   Al validar exitoso, marca la sesión como verificada y redirige al `next=`.

Bootstrap: el primer staff sin dispositivos puede acceder al admin sin OTP
para crear su primer TOTPDevice. En cuanto lo confirme, las próximas sesiones
deberán pasar por la verificación.
"""

import logging
import os

from django import forms
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils.deprecation import MiddlewareMixin

from django_otp import login as otp_login
from django_otp.plugins.otp_totp.models import TOTPDevice
from django_otp.plugins.otp_static.models import StaticDevice

logger = logging.getLogger(__name__)


# Igual fórmula que en urls.py — preferimos no importar circularmente.
def _admin_url_prefix() -> str:
    return '/' + os.environ.get('ADMIN_URL_PATH', 'zyfit-admin').strip('/') + '/'


def _user_has_confirmed_otp(user) -> bool:
    """¿El usuario tiene al menos un dispositivo TOTP o static confirmado?"""
    if not user.is_authenticated:
        return False
    if TOTPDevice.objects.filter(user=user, confirmed=True).exists():
        return True
    if StaticDevice.objects.filter(user=user, confirmed=True).exists():
        return True
    return False


# ─── Middleware ───────────────────────────────────────────────────────────────

class OTPRequiredForAdminMiddleware(MiddlewareMixin):
    """Fuerza OTP en URLs del admin cuando el staff ya tiene dispositivo.

    Bootstrap: si el usuario no tiene dispositivo confirmado, se permite el
    acceso para que pueda crearlo. Una vez confirmado, todas las sesiones
    futuras deben pasar por `otp_verify_view` antes de poder entrar al admin.

    En `DEBUG=True` el middleware no enforza nada — sería un dolor en local.
    """

    def process_request(self, request):
        if settings.DEBUG:
            return None

        admin_prefix = _admin_url_prefix()
        if not request.path.startswith(admin_prefix):
            return None

        # Permitir la propia página de verificación + estáticos del admin.
        if (
            request.path.startswith(admin_prefix + 'otp-verify/')
            or request.path.startswith(admin_prefix + 'jsi18n/')
            or request.path.startswith(admin_prefix + 'login/')
            or request.path.startswith(admin_prefix + 'logout/')
        ):
            return None

        # Sin autenticación → que el admin haga su redirect a login normal.
        if not getattr(request, 'user', None) or not request.user.is_authenticated:
            return None

        # No-staff no debería estar aquí — que el admin lo rechace.
        if not request.user.is_staff:
            return None

        # Bootstrap: no tiene dispositivo aún → entrar para crearlo.
        if not _user_has_confirmed_otp(request.user):
            return None

        # Ya tiene dispositivo confirmado. Exigir verificación.
        if request.user.is_verified():
            return None

        # Redirect a la verificación, preservando el destino original.
        verify_url = admin_prefix + 'otp-verify/'
        if request.path and request.path != admin_prefix:
            verify_url += f'?next={request.path}'
        return HttpResponseRedirect(verify_url)


# ─── Vista de verificación ────────────────────────────────────────────────────

class OTPVerifyForm(forms.Form):
    token = forms.CharField(
        label='Código de 6 dígitos',
        max_length=8,
        min_length=6,
        widget=forms.TextInput(attrs={
            'autocomplete': 'one-time-code',
            'autofocus':    'autofocus',
            'inputmode':    'numeric',
            'pattern':      '[0-9]*',
            'placeholder':  '000000',
        }),
    )


def _verify_against_user_devices(user, token: str):
    """Recorre TOTP + static devices del usuario. Devuelve el device si verifica."""
    for device in TOTPDevice.objects.filter(user=user, confirmed=True):
        if device.verify_token(token):
            return device
    for device in StaticDevice.objects.filter(user=user, confirmed=True):
        if device.verify_token(token):
            return device
    return None


@login_required
def otp_verify_view(request):
    """Pantalla que pide el código TOTP para esta sesión."""
    next_url = request.GET.get('next') or request.POST.get('next') or _admin_url_prefix()

    # Si ya está verificado, pasamos directo.
    if request.user.is_verified():
        return redirect(next_url)

    error = None
    form = OTPVerifyForm()

    if request.method == 'POST':
        form = OTPVerifyForm(request.POST)
        if form.is_valid():
            token = form.cleaned_data['token'].strip().replace(' ', '')
            device = _verify_against_user_devices(request.user, token)
            if device is not None:
                otp_login(request, device)
                logger.info(
                    'otp_verify: ok user=%s device=%s',
                    request.user.email, device.__class__.__name__,
                )
                return redirect(next_url)
            error = 'Código inválido o expirado. Intenta de nuevo.'
            logger.warning('otp_verify: failed for user=%s', request.user.email)

    ctx = {
        'form':       form,
        'error':      error,
        'next':       next_url,
        'user_email': request.user.email,
    }
    return render(request, 'admin/zyfit_otp_verify.html', ctx)
