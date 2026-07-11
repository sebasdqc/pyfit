from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

PRODUCTO_ZYFIT_PRO = 'zyfit_pro'
PRODUCTO_ACADEMY_PRO = 'academy_pro'
PRODUCTO_CHOICES = [
    (PRODUCTO_ZYFIT_PRO, 'Zyfit Pro'),
    (PRODUCTO_ACADEMY_PRO, 'Zyfit Academy Pro'),
]


class Influencer(models.Model):
    """Creador de contenido con el que se acuerda un código de descuento a
    cambio de una comisión fija por cada suscripción que genere. El pago de
    la comisión se coordina por fuera de la app (transferencia, etc.) — este
    modelo solo guarda los datos de contacto/cobro para que el staff sepa a
    quién y cómo pagarle."""

    nombre = models.CharField(max_length=120)
    contacto = models.CharField(max_length=150, blank=True, default='')
    notas_pago = models.TextField(blank=True, default='')
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'promos_influencer'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class CodigoPromocional(models.Model):
    """Código que un influencer reparte a su audiencia. Define el descuento
    que recibe quien lo usa y la comisión fija que se le debe al influencer
    por cada suscripción confirmada con este código."""

    TIPO_PORCENTAJE = 'porcentaje'
    TIPO_FIJO = 'fijo'
    TIPO_DESCUENTO_CHOICES = [
        (TIPO_PORCENTAJE, 'Porcentaje'),
        (TIPO_FIJO, 'Monto fijo'),
    ]

    codigo = models.CharField(max_length=20, unique=True)
    influencer = models.ForeignKey(Influencer, on_delete=models.CASCADE, related_name='codigos')
    producto = models.CharField(max_length=20, choices=PRODUCTO_CHOICES, default=PRODUCTO_ZYFIT_PRO)
    tipo_descuento = models.CharField(max_length=20, choices=TIPO_DESCUENTO_CHOICES, default=TIPO_PORCENTAJE)
    valor_descuento = models.DecimalField(
        max_digits=6, decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
    )
    comision_monto = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
    )
    activo = models.BooleanField(default=True)
    usos_maximos = models.IntegerField(null=True, blank=True)
    valido_hasta = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'promos_codigo_promocional'
        ordering = ['-created_at']

    def __str__(self):
        return self.codigo

    def save(self, *args, **kwargs):
        if self.codigo:
            self.codigo = self.codigo.strip().upper()
        super().save(*args, **kwargs)

    def es_valido(self):
        from datetime import date

        if not self.activo:
            return False
        if self.valido_hasta and date.today() > self.valido_hasta:
            return False
        if self.usos_maximos is not None:
            usos = self.solicitudes.filter(estado__in=[
                SolicitudSuscripcion.ESTADO_PENDIENTE, SolicitudSuscripcion.ESTADO_CONFIRMADA,
            ]).count()
            if usos >= self.usos_maximos:
                return False
        return True


class SolicitudSuscripcion(models.Model):
    """Pedido de un usuario para suscribirse a Zyfit Pro o a Zyfit Academy
    Pro (`producto`). Sin cobrador conectado todavía (ver `promos.payments`):
    el staff cobra por fuera de la app y confirma aquí, lo que activa el
    producto correspondiente (`Profile.plan` o `AcademySubscription`) y deja
    registrada la comisión que se le debe al influencer del código usado, si
    hubo uno."""

    # Unión de los plan_tipo válidos de ambos productos — cuál subconjunto
    # aplica lo decide `promos.payments.PRECIOS[producto]`, no este choices.
    PLAN_TIPO_CHOICES = [
        ('mensual', 'Mensual'),
        ('trimestral', 'Trimestral'),
        ('semestral', 'Semestral'),
        ('anual', 'Anual'),
    ]

    ESTADO_PENDIENTE = 'pendiente'
    ESTADO_CONFIRMADA = 'confirmada'
    ESTADO_RECHAZADA = 'rechazada'
    ESTADO_CHOICES = [
        (ESTADO_PENDIENTE, 'Pendiente'),
        (ESTADO_CONFIRMADA, 'Confirmada'),
        (ESTADO_RECHAZADA, 'Rechazada'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='solicitudes_suscripcion',
    )
    producto = models.CharField(max_length=20, choices=PRODUCTO_CHOICES, default=PRODUCTO_ZYFIT_PRO)
    plan_tipo = models.CharField(max_length=20, choices=PLAN_TIPO_CHOICES)
    codigo_promocional = models.ForeignKey(
        CodigoPromocional, on_delete=models.SET_NULL, null=True, blank=True, related_name='solicitudes',
    )

    # Snapshots calculados en servidor al crear la solicitud — nunca se
    # recalculan después, para que ajustes futuros al código no alteren un
    # pedido u una comisión ya generados.
    precio_lista = models.DecimalField(max_digits=6, decimal_places=2)
    descuento_aplicado = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0'))
    precio_final = models.DecimalField(max_digits=6, decimal_places=2)
    comision_influencer = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0'))

    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_PENDIENTE)
    notas_admin = models.TextField(blank=True, default='')

    comision_pagada = models.BooleanField(default=False)
    fecha_pago_comision = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    confirmada_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'promos_solicitud_suscripcion'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user_id} · {self.plan_tipo} [{self.estado}]'
