"""AppConfig de Django admin para Zyfit.

Originalmente intentábamos forzar un `default_site` propio, pero django-unfold
reemplaza `admin.site` completamente en su propia `ready()`. Como Unfold corre
antes que nosotros, cualquier intento de heredar de UnfoldAdminSite + OTPAdminSite
es frágil.

La estrategia robusta vive en `OTPRequiredForAdminMiddleware` (pyfit/admin_security.py):
un middleware liviano que intercepta las URLs del admin y manda a una página de
verificación de TOTP cuando el usuario tiene un dispositivo confirmado pero la
sesión aún no fue OTP-verificada.
"""

from django.contrib.admin.apps import AdminConfig


class ZyfitAdminConfig(AdminConfig):
    # No tocamos default_site — Unfold lo reemplaza igualmente. El branding
    # ya queda aplicado vía `admin.site.site_header` en `pyfit/urls.py`.
    pass
