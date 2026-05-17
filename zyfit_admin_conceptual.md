# Zyfit — Panel Admin: Instrucciones Conceptuales

> Stack: Django · Digital Ocean · Expo Go
> Esta guía es conceptual. No contiene código ni entidades técnicas, sino el razonamiento, el orden y las decisiones detrás de cada paso.

---

## Índice

1. [El punto de partida](#1-el-punto-de-partida)
2. [Fase 1 — Activar el admin](#2-fase-1--activar-el-admin)
3. [Fase 2 — Crear el usuario administrador](#3-fase-2--crear-el-usuario-administrador)
4. [Fase 3 — Darle una cara presentable](#4-fase-3--darle-una-cara-presentable)
5. [Fase 4 — El botón de cambio Admin ↔ User](#5-fase-4--el-botón-de-cambio-admin--user)
6. [Fase 5 — Seguridad básica](#6-fase-5--seguridad-básica-no-negociable-antes-del-primer-deploy)
7. [Fase 6 — Seguridad robusta para producción](#7-fase-6--seguridad-robusta-para-producción-real)
8. [Fase 7 — Visibilidad operativa](#8-fase-7--visibilidad-operativa)
9. [Orden de ejecución recomendado](#9-orden-de-ejecución-recomendado)

---

## 1. El punto de partida

Django ya trae un sistema de administración incluido. No es algo que hay que construir desde cero — existe, está ahí, y solo necesita ser activado, configurado y protegido. Piénsalo como una sala de control que viene con el edificio pero que hay que amueblar y ponerle llave.

---

## 2. Fase 1 — Activar el admin

Lo primero es confirmar que Django sabe que quieres usar el panel. Esto se hace en el archivo de configuración principal del proyecto, donde le dices a Django qué componentes usar. El admin, el sistema de autenticación y el manejo de sesiones deben estar listados ahí.

Luego, en el archivo que define las rutas de tu aplicación, tienes que asignarle una dirección web al admin. **La instrucción más importante aquí es no usar la ruta por defecto.** Django usa `/admin/` por defecto, y eso es lo primero que cualquier bot o atacante va a intentar. Cámbiala por algo específico de Zyfit que solo tu equipo conozca.

Finalmente, asegúrate de que los archivos visuales del admin (CSS, íconos) estén disponibles para el servidor. Hay un comando de Django que los recolecta y organiza — córrelo cada vez que hagas cambios.

---

## 3. Fase 2 — Crear el usuario administrador

Django distingue tres niveles de usuarios:

| Nivel | Descripción |
|---|---|
| **Usuario normal** | Solo usa la app |
| **Usuario staff** | Puede entrar al admin con permisos limitados |
| **Superusuario** | Control total sobre el sistema |

Para arrancar, necesitas crear al menos un superusuario. Django tiene un comando de terminal para esto que te pide un nombre, un email y una contraseña. Ese usuario es literalmente la llave maestra de todo el sistema, así que la contraseña debe ser larga, única, y guardada en un gestor de contraseñas — no en un chat, no en un sticky note, no en el código.

Para el equipo de Zyfit la recomendación es pensar en roles desde el inicio: quién necesita ver todo, quién solo necesita ver usuarios, quién solo necesita ver métricas. **No todos los que necesitan acceso al admin necesitan ser superusuarios.**

---

## 4. Fase 3 — Darle una cara presentable

El admin por defecto de Django es funcional pero visualmente anticuado. Existe una librería llamada `django-unfold` que lo reemplaza con una interfaz moderna, responsiva y personalizable sin tener que construir nada desde cero.

Con ella puedes aplicar los colores de Zyfit, configurar la barra lateral con las secciones que te importan, y hacer que la experiencia se sienta coherente con el resto del producto. Es instalación y configuración — no desarrollo de interfaz.

---

## 5. Fase 4 — El botón de cambio Admin ↔ User

Este es el feature central. La idea es simple: cualquier miembro del equipo con acceso al admin debe poder cambiar entre "estoy administrando" y "estoy viendo la app como la ve un usuario", sin cerrar sesión.

Conceptualmente funciona así:

1. Cuando alguien entra al admin, el sistema registra en su sesión que está en **modo admin**.
2. Hay un botón visible en la parte superior del panel que dice algo como **"Ver como usuario"**. Al presionarlo, el sistema cambia ese registro de sesión y redirige a la app normal.
3. En la app, aparece un botón flotante o en el header que dice **"Volver al admin"**, que hace el proceso inverso.

El punto clave de seguridad aquí es que este botón solo debe existir y funcionar para usuarios que el sistema haya verificado como staff. Un usuario normal nunca debe poder acceder a este mecanismo.

---

## 6. Fase 5 — Seguridad básica (no negociable antes del primer deploy)

Hay cuatro cosas que deben estar resueltas antes de que el admin esté en producción:

### Las credenciales no van en el código
Contraseñas, claves secretas, URLs de bases de datos — todo eso va en un archivo de variables de entorno separado que nunca se sube a GitHub. El código solo lee esas variables, nunca las contiene.

### La ruta del admin es secreta
Como se mencionó antes, nunca `/admin/`. La ruta debe estar también en las variables de entorno para que ni siquiera esté visible en el repositorio.

### El admin debe tener límite de intentos de login
Si alguien intenta contraseñas repetidamente, el sistema debe bloquearlo después de algunos intentos. Hay una librería para Django que resuelve esto en minutos.

### El acceso al admin debe estar restringido por IP
En tu servidor de Digital Ocean, a nivel del servidor web que recibe las peticiones, puedes configurar que la ruta del admin solo responda a ciertas direcciones IP. Todo lo demás recibe un error o simplemente silencio. Esto es una de las protecciones más efectivas que existen.

---

## 7. Fase 6 — Seguridad robusta para producción real

Una vez que Zyfit tenga usuarios reales, hay tres capas adicionales que deberían estar activas:

### Autenticación de dos factores (2FA)
La contraseña sola no es suficiente. Cualquier cuenta con acceso al admin debe requerir un segundo factor — el código de una app como Google Authenticator o Authy. Existe una librería de Django que implementa esto sin construir nada desde cero.

### Registro de auditoría
Cada acción que alguien haga desde el admin — crear un usuario, modificar un perfil, eliminar un registro — debe quedar registrada con quién la hizo, cuándo, y desde qué IP. Esto no es opcional si tienes datos de usuarios. Existe una librería que lo hace automáticamente sobre cualquier modelo que decidas monitorear.

### HTTPS obligatorio
Toda comunicación entre el navegador y el servidor debe estar cifrada. En Digital Ocean esto se configura con Certbot, que instala un certificado SSL gratuito y se renueva solo. El servidor debe estar configurado para rechazar cualquier conexión que no sea HTTPS.

---

## 8. Fase 7 — Visibilidad operativa

Una vez que el admin funciona y está seguro, el siguiente nivel es poder ver el estado del sistema en tiempo real desde el propio panel.

Esto implica dos cosas:

**Monitoreo de errores en tiempo real.** Conectar un servicio externo (Sentry es el estándar del mercado) para que cualquier error en producción llegue como alerta inmediata al equipo, con contexto de qué pasó, en qué parte de la app y con qué frecuencia.

**Dashboard de métricas dentro del admin.** Una vista dentro del propio panel que muestre los números clave — usuarios nuevos, usuarios activos, distribución de planes — consultando directamente la base de datos de Zyfit. Esta vista es la traducción técnica del dashboard visual que ya diseñamos en las sesiones previas.

---

## 9. Orden de ejecución recomendado

| Sprint | Fases | Tiempo estimado | Resultado |
|---|---|---|---|
| **Sprint 1** | Fases 1, 2, 4 y 5 | 1 día | Admin funcional, seguro y con cambio de vista |
| **Sprint 2** | Fase 3 | Medio día | Interfaz presentable con identidad Zyfit |
| **Sprint 3** | Fase 6 | 1 día | Listo para producción con usuarios reales |
| **Sprint 4** | Fase 7 | Paralelo al desarrollo | Visibilidad operativa completa |

> El Sprint 1 y 2 pueden hacerse en el mismo día. El Sprint 3 debe completarse antes de cualquier lanzamiento público.

---

*Documento conceptual para el proyecto Zyfit — versión 1.0*
