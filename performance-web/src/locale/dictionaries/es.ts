// Diccionario fuente (español) de las páginas públicas de Zyfit Performance.
// Todo el copy vivía hardcodeado en los componentes; se movió acá para poder
// ofrecer inglés (ver dictionaries/en.ts) con el mismo mecanismo que ya usa
// academy-web. Estructura por página/sección, no por componente.
const es = {
  header: {
    audience: {
      label: 'Para quién',
      equipos: 'Equipos deportivos',
      atletas: 'Atletas de alto rendimiento',
      instituciones: 'Instituciones educativas',
    },
    precio: 'Precio',
    login: 'Iniciar sesión',
    register: 'Registrarse',
    languageLabel: 'Idioma',
  },
  footer: {
    tag: 'Performance',
    contact: 'Contacto',
    copyright: '© {{year}} Zyfit Performance',
  },
  modules: {
    rendimiento: {
      name: 'Rendimiento',
      body: 'Carga interna, forma (fitness-fatiga) y ACWR con seguimiento por atleta y por equipo.',
    },
    lesiones: {
      name: 'Lesiones',
      body: 'Registro con mapa corporal, seguimiento de recuperación y contexto de riesgo para el resto del panel.',
    },
    tests: {
      name: 'Test físicos',
      body: 'Baterías con las fórmulas de siempre —Bangsbo IR2, Draper & Whyte RAST, entre otras— calculadas en el servidor.',
    },
    planificacion: {
      name: 'Planificación',
      body: 'Meso y microciclos por equipo, con un asesor de solo lectura que sugiere ajustes según carga y lesiones.',
    },
    psicologico: {
      name: 'Psicológico',
      body: 'BRUMS/POMS, RESTQ-Sport, CSAI-2 y ABQ — psicometría deportiva junto al resto de los datos del atleta.',
    },
    simulador: {
      name: 'Simulador táctico',
      body: 'Pizarra táctica animada, fútbol o futsal, para preparar y compartir jugadas con el plantel.',
    },
    calendario: {
      name: 'Calendario',
      body: 'Torneos, concentraciones, partidos y entrenamientos de toda la temporada en una sola línea de tiempo.',
    },
  },
  landing: {
    hero: {
      rail: {
      segmento: 'Perfil',
      pais: 'País',
      cargo: 'Cargo',
      plantel: 'Plantel',
      necesidades: 'Necesidades',
      canal: 'Origen',
      centro: 'Centro',
    },
    eyebrow: 'Panel B2B · Alto rendimiento deportivo',
      titleLine1: 'Ciencia deportiva,',
      titleLine2: 'en un solo panel',
      body: 'Rendimiento, lesiones, test físicos, planificación y psicológico — un panel para equipos deportivos, instituciones educativas y atletas de alto rendimiento.',
      ctaPrimary: 'Solicitar acceso',
      ctaSecondary: 'Ya tengo acceso · Ingresar',
    },
    audienceSection: {
      eyebrow: 'Para quién es',
      title: 'Pensado para quien mide el rendimiento en serio',
      equipos: {
        title: 'Equipos deportivos',
        body: 'Clubes y centros de fútbol o futsal que necesitan a todo su cuerpo técnico —físico, médico, táctico y psicológico— coordinado en un solo panel.',
      },
      instituciones: {
        title: 'Instituciones educativas',
        body: 'Escuelas y academias deportivas que forman jóvenes atletas y necesitan seguimiento objetivo de carga, test y evolución a lo largo de las temporadas.',
      },
      atletas: {
        title: 'Atletas de alto rendimiento',
        body: 'Deportistas individuales que entrenan con un cuerpo técnico propio y quieren sus datos de carga, test y recuperación en un solo lugar.',
      },
    },
    modulesSection: {
      eyebrow: 'Módulos',
      title: 'Todo el cuerpo técnico, en un solo lugar',
      subtitle:
        'Cada rol —director técnico, preparador físico, fisioterapeuta, analista, planificador, psicólogo— accede solo a lo que le corresponde.',
    },
    methodology: {
      eyebrow: 'Metodología',
      title: '25 calculadoras con la ciencia citada, no una caja negra',
      p1: 'Cada fórmula del panel —sRPE, monotonía y strain de Foster, ACWR (agudo:crónico) en sus variantes de rolling average y EWMA, TRIMP de Edwards, forma (fitness-fatiga estilo Banister)— está documentada y se calcula siempre en el servidor. El staff nunca depende de una planilla aparte.',
      p2: 'Somos honestos con los límites: el ACWR es un indicador contextual de carga, no un predictor causal de lesión. El panel da el número y el contexto — la decisión sigue siendo del cuerpo técnico.',
      bullets: {
        0: '25 calculadoras + batería psicométrica completa (BRUMS/POMS/RESTQ-Sport/CSAI-2/ABQ)',
        1: 'Todo el cálculo vive en el servidor — el panel nunca improvisa un número',
        2: 'Roles de staff independientes por centro, con acceso por módulo',
      },
    },
    engine: {
      eyebrow: 'Motor de cálculo',
      title: 'Ninguna fórmula es una caja negra — probalas vos mismo',
      subtitle:
        'Elegí una calculadora, cargá tus números y mirá el resultado — las mismas fórmulas que usa el panel real para cada atleta.',
      calculators: {
        acwr: 'ACWR',
        srpe: 'Carga de sesión (sRPE)',
        sayers: 'Potencia de salto (Sayers)',
      },
      acwr: {
        fieldAguda: 'Carga aguda',
        unitAguda: '7 días',
        fieldCronica: 'Carga crónica',
        unitCronica: 'prom. 4 semanas',
        placeholder: 'Cargá ambos valores',
        zoneRiesgo: 'Riesgo elevado',
        zoneAtencion: 'Zona de atención',
        zoneOptima: 'Zona óptima (sweet spot)',
        zoneBaja: 'Por debajo del rango óptimo',
        disclaimer:
          'Vista simplificada con fines demostrativos — en el panel real, el ACWR se calcula por atleta y por equipo, en variantes de rolling average y EWMA, y se cruza automáticamente con lesiones y planificación. No sustituye el seguimiento diario del cuerpo técnico.',
      },
      srpe: {
        fieldRpe: 'RPE percibido',
        unitRpe: '0–10, Borg CR-10',
        fieldDuracion: 'Duración',
        unitDuracion: 'minutos',
        resultLabel: 'Carga interna de la sesión',
        disclaimer:
          'RPE × duración (Foster/Borg CR-10) — la misma cuenta que registra el módulo de Carga interna, sesión por sesión. El panel real la acumula día a día para calcular monotonía, strain y ACWR.',
      },
      sayers: {
        fieldAltura: 'Altura del salto',
        unitAltura: 'cm',
        fieldMasa: 'Masa corporal',
        unitMasa: 'kg',
        resultLabel: 'Potencia pico estimada (Squat Jump)',
        disclaimer:
          'Fórmula de Sayers et al. (1999): 60.7 × altura(cm) + 45.3 × masa(kg) − 2055. El panel también puede calcular la altura directo desde el tiempo de vuelo del salto.',
      },
    },
    howItWorks: {
      eyebrow: 'Cómo funciona',
      title: 'De centro nuevo a decisiones con datos',
      steps: {
        0: {
          title: 'El director registra el centro',
          body: 'Se da de alta el centro deportivo y se suma al staff con su rol correspondiente — director técnico, preparador físico, fisioterapeuta, analista, planificador o psicólogo.',
        },
        1: {
          title: 'Cada rol carga sus datos',
          body: 'Test, sesiones, lesiones y evaluaciones psicológicas se registran donde ocurren, no en una planilla aparte al final de la semana.',
        },
        2: {
          title: 'El panel devuelve contexto, no solo números',
          body: 'ACWR, forma, riesgo y planificación se cruzan automáticamente para que el cuerpo técnico decida con datos, no solo con percepción.',
        },
      },
    },
    faq: {
      eyebrow: 'Preguntas frecuentes',
      title: 'Lo que más nos preguntan los centros',
      items: {
        0: {
          q: '¿El panel es para atletas o para el cuerpo técnico?',
          a: 'Es para el staff: director técnico, preparador físico, fisioterapeuta, analista, planificador y psicólogo. Los atletas no inician sesión — el director o el staff los registra dentro de cada centro.',
        },
        1: {
          q: '¿Funciona para fútbol y futsal?',
          a: 'Sí, el simulador táctico y la carga de datos contemplan ambas disciplinas desde el diseño del panel.',
        },
        2: {
          q: '¿Quién ve los datos de cada atleta?',
          a: 'El acceso es por módulo y por rol dentro de cada centro — un preparador físico, por ejemplo, no ve las evaluaciones psicológicas si ese módulo no está habilitado para su rol.',
        },
        3: {
          q: '¿Cómo se suma un centro nuevo al panel?',
          a: 'Contactanos y coordinamos el alta del centro y de los roles de tu cuerpo técnico — hoy el acceso se gestiona directamente con nuestro equipo, no es autoservicio.',
        },
      },
    },
    ctaFinal: {
      title: '¿Listo para profesionalizar tu cuerpo técnico?',
      body: 'Contactanos y coordinamos el alta de tu centro deportivo y los roles de tu staff.',
      cta: 'Solicitar acceso',
    },
    testCarousel: {
      label: 'Test físico',
      badge: 'Ejemplo',
      slides: {
        0: {
          name: 'Squat Jump',
          body: 'Salto sin contramovimiento — estima la potencia del tren inferior a partir de la altura alcanzada.',
          unit: '≈ 3.5 kW',
        },
        1: {
          name: 'Sprint 10 m',
          body: 'Capacidad de aceleración inicial en los primeros metros de una carrera lineal.',
          unit: 'tiempo',
        },
        2: {
          name: 'RSI · Drop Jump',
          body: 'Índice de fuerza reactiva: altura del salto dividida el tiempo de contacto con el suelo.',
          unit: 'índice',
        },
      },
    },
  },
  pricing: {
    eyebrow: 'Precio',
    title: 'Un plan para cada perfil',
    subtitle:
      'El acceso se coordina directamente con nuestro equipo — sin tarjeta ni autoservicio. Contactanos y armamos el plan según tu centro, tu staff y los módulos que necesitás.',
    mostElegido: 'Más elegido',
    aMedida: 'A medida',
    contactanos: '/ contactanos',
    solicitarAcceso: 'Solicitar acceso',
    verMas: 'Ver más para este perfil',
    plans: {
      atleta: {
        name: 'Atleta individual',
        audience: 'Para deportistas que entrenan con un cuerpo técnico propio.',
        features: {
          0: 'Rendimiento — carga interna, ACWR y forma',
          1: 'Test físicos con fórmulas citadas',
          2: 'Psicológico — BRUMS/POMS, RESTQ-Sport, CSAI-2, ABQ',
          3: 'Lesiones con mapa corporal y seguimiento',
        },
      },
      equipo: {
        name: 'Equipo',
        audience: 'Para clubes y centros de fútbol o futsal.',
        features: {
          0: 'Los 5 módulos completos, con roles de staff independientes',
          1: 'Planificación con sesiones de equipo generadas por IA',
          2: 'Simulador táctico y calendario de temporada',
          3: 'Asesor de planificación de solo lectura',
        },
      },
      institucion: {
        name: 'Institución',
        audience: 'Para escuelas y academias deportivas formativas.',
        features: {
          0: 'Todo lo del plan Equipo, por categoría y grupo etario',
          1: 'Seguimiento comparable temporada tras temporada',
          2: 'Reportes para mostrar a familias y directivos',
          3: 'Múltiples centros bajo la misma institución',
        },
      },
    },
    ctaTitle: '¿No sabés qué plan es el tuyo?',
    ctaBody: 'Contanos cómo está armado tu cuerpo técnico y te ayudamos a elegir.',
  },
  audience: {
    solicitarAcceso: 'Solicitar acceso',
    verPlanes: 'Ver planes',
    modulosRelevantes: 'Módulos relevantes',
    loQueVasAUsar: 'Lo que vas a usar todos los días',
    segments: {
      equipos: {
        eyebrow: 'Para equipos deportivos',
        title: 'Todo tu cuerpo técnico, coordinado en un solo panel.',
        subtitle:
          'Clubes y centros de fútbol o futsal que necesitan a todo su staff —físico, médico, táctico y psicológico— trabajando sobre los mismos datos, no en planillas sueltas.',
        benefits: {
          0: {
            title: 'Un plantel, todos los roles',
            body: 'Director técnico, preparador físico, fisioterapeuta, analista, planificador y psicólogo acceden al mismo plantel, cada uno solo a los módulos que le corresponden.',
          },
          1: {
            title: 'Sesiones de equipo generadas con IA',
            body: 'El planificador arma meso y microciclos por equipo —no por atleta, porque en fútbol y futsal se entrena junto— con un asesor de solo lectura que sugiere ajustes según carga y lesiones.',
          },
          2: {
            title: 'Riesgo de lesión con contexto, no solo el parte médico',
            body: 'El ACWR y la carga se cruzan automáticamente con el estado de cada jugador, para que el cuerpo técnico decida con datos, no solo con el diagnóstico aislado.',
          },
          3: {
            title: 'Simulador táctico incluido',
            body: 'Pizarra táctica animada para fútbol o futsal, para preparar y compartir jugadas con el plantel — disponible para todo el staff, sin gating de módulo.',
          },
        },
        closingTitle: '¿Listo para profesionalizar tu cuerpo técnico?',
        closingBody: 'Contactanos y coordinamos el alta de tu centro deportivo y los roles de tu staff.',
      },
      atletas: {
        eyebrow: 'Para atletas de alto rendimiento',
        title: 'Tu carga, tus test y tu recuperación, en un solo lugar.',
        subtitle:
          'Deportistas individuales que entrenan con un cuerpo técnico propio —preparador físico, fisioterapeuta, psicólogo— y quieren ver sus datos cruzados, no repartidos en apps sueltas.',
        note: 'Vos no cargás tus propios datos: tu preparador o fisioterapeuta te registra dentro de su panel, igual que un club haría con su plantel — así todo tu equipo técnico trabaja sobre la misma información. Los atletas no inician sesión de forma directa.',
        benefits: {
          0: {
            title: 'Tu ACWR y tu forma, siempre al día',
            body: 'Carga interna (sRPE), monotonía, strain y forma (fitness-fatiga) calculadas en el servidor, sesión por sesión — no una planilla que alguien tiene que actualizar a mano.',
          },
          1: {
            title: 'Test físicos con fórmulas citadas',
            body: 'Squat Jump, Sprint, RSI y el resto de la batería física con las mismas fórmulas documentadas que usa un club — Sayers, Bangsbo IR2, Draper & Whyte RAST, entre otras.',
          },
          2: {
            title: 'Lo psicológico, junto a lo físico',
            body: 'BRUMS/POMS, RESTQ-Sport, CSAI-2 y ABQ — tu estado mental al lado de tu carga de entrenamiento, no en una consulta aparte.',
          },
          3: {
            title: 'Historial de lesiones con contexto',
            body: 'Registro con mapa corporal y seguimiento de recuperación, visible para todo tu equipo técnico — no solo para quien te atendió ese día.',
          },
        },
        closingTitle: '¿Listo para que tu equipo técnico entrene con datos?',
        closingBody: 'Contactanos y coordinamos el alta tuya y de tu cuerpo técnico dentro del panel.',
      },
      instituciones: {
        eyebrow: 'Para instituciones educativas',
        title: 'Seguimiento objetivo de tus jóvenes atletas, temporada tras temporada.',
        subtitle:
          'Escuelas y academias deportivas que forman jóvenes atletas y necesitan ver su evolución de carga, test y desarrollo a lo largo de varias temporadas — no solo de un torneo.',
        benefits: {
          0: {
            title: 'Test físicos comparables en el tiempo',
            body: 'La misma batería de test, con las mismas fórmulas, repetida temporada tras temporada — para ver evolución real de cada alumno, no solo una foto aislada.',
          },
          1: {
            title: 'Toda la temporada en una línea de tiempo',
            body: 'Torneos, concentraciones, partidos y entrenamientos organizados junto con la carga real de cada categoría.',
          },
          2: {
            title: 'Planificación por categoría',
            body: 'Meso y microciclos por equipo, adaptados a cada categoría formativa, con un asesor de solo lectura que sugiere ajustes según carga y lesiones.',
          },
          3: {
            title: 'Reportes para familias y directivos',
            body: 'Datos objetivos de rendimiento y desarrollo, no solo la percepción del entrenador — útiles puertas adentro y para comunicar resultados.',
          },
        },
        closingTitle: '¿Listo para llevar el seguimiento de tu institución a un solo panel?',
        closingBody: 'Contactanos y coordinamos el alta de tu institución y de los roles de tu staff.',
      },
    },
  },
  onboarding: {
    // Cabecera y navegación del wizard
    eyebrow: 'Configuración inicial',
    pasoDe: 'Paso {{actual}} de {{total}}',
    continuar: 'Continuar',
    atras: 'Atrás',
    guardando: 'Guardando…',
    empezar: 'Empezar',
    finalizar: 'Finalizar',
    errorGuardar: 'No pudimos guardar tu respuesta. Revisa tu conexión e inténtalo de nuevo.',
    reintentar: 'Reintentar',
    cerrarSesion: 'Cerrar sesión',
    // Paso 0 — presentación
    introTitle: 'Hola, {{nombre}}',
    introBody: 'Antes de abrir el panel queremos conocer tu contexto de trabajo. Son {{n}} preguntas y toma menos de un minuto.',
    introPunto1: 'Ordenamos el panel según tu tipo de organización, tu deporte y el tamaño de tu plantel.',
    introPunto2: 'Priorizamos los módulos que viniste a buscar.',
    introPunto3: 'Nos dice quién está usando Performance y desde dónde.',
    // Paso 1 — segmento de público (mismos 3 que la landing)
    segmentoTitle: '¿Cuál describe mejor tu caso?',
    segmentoBody: 'Es lo que más cambia cómo se ordena el panel. Puedes ajustar el resto después.',
    segmento: {
      equipos: 'Equipo deportivo',
      equipos_hint: 'Un club o centro con cuerpo técnico completo trabajando sobre el mismo plantel.',
      instituciones: 'Institución educativa',
      instituciones_hint: 'Escuela o academia que forma jóvenes atletas y sigue su evolución por temporadas.',
      atletas: 'Atleta de alto rendimiento',
      atletas_hint: 'Deportista individual con su propio cuerpo técnico, que quiere sus datos en un solo lugar.',
    },
    tamanoLabelAtletas: '¿Entrenas solo o con un grupo?',
    centroTitleAtleta: 'Crea tu espacio de trabajo',
    centroBodyAtleta: 'Es donde viven tus tests, tu carga y tu planificación. Puedes ponerle tu nombre o el de tu equipo de trabajo.',
    centroNombre: 'Nombre del centro',
    centroNombreAtleta: 'Nombre del espacio',
    centroCiudad: 'Ciudad (opcional)',
    // Paso 2 — país
    paisTitle: '¿Desde qué país trabajas?',
    paisBody: 'Lo usamos para las zonas horarias del calendario y para saber dónde crece Performance.',
    paisLabel: 'País',
    paisBuscar: 'Busca tu país',
    paisSinResultados: 'Ningún país coincide con esa búsqueda.',
    paisSugeridos: 'Sugeridos',
    paisTodos: 'Todos los países',
    // Paso 3 — cargo
    cargoTitle: '¿Cuál es tu cargo?',
    cargoBody: 'Determina qué se muestra primero en tu panel y con qué nivel de detalle.',
    cargoOtroLabel: 'Contanos tu cargo',
    cargoOtroPlaceholder: 'p. ej. Readaptador físico',
    // Paso 4 — deporte y plantel
    planteTitle: '¿Con quiénes trabajas?',
    planteBody: 'El deporte y el tamaño del grupo cambian qué métricas tienen sentido para ti.',
    disciplinaLabel: 'Deporte principal',
    disciplinaOtroLabel: 'Contanos cuál',
    disciplinaOtroPlaceholder: 'p. ej. Hockey sobre césped',
    tamanoLabel: '¿Cuántos atletas sigues?',
    // Paso 5 — necesidades
    necesidadesTitle: '¿Qué necesitas resolver?',
    necesidadesBody: 'Marca todo lo que aplique. Puedes cambiarlo después: no bloquea ningún módulo.',
    necesidadesOpcional: 'Puedes continuar sin marcar nada.',
    necesidadesSeleccionadas: '{{n}} seleccionadas',
    necesidadesUna: '1 seleccionada',
    // Paso 6 — canal
    canalTitle: '¿Cómo llegaste a Zyfit Performance?',
    canalBody: 'La última. Nos ayuda a saber qué vale la pena sostener.',
    canalOtroLabel: 'Contanos cómo',
    canalOtroPlaceholder: 'p. ej. Un video de YouTube',
    // Paso 7 — crear centro (solo si es director/admin y no tiene ninguno)
    centroTitle: 'Crea tu centro deportivo',
    centroBody: 'Es el espacio donde viven tu plantel, tus tests y tu planificación. Serás su director técnico y podrás sumar staff después.',
    centroOmitir: 'Lo creo más tarde',
    centroCreado: 'Centro creado',
    // Cierre
    finTitle: 'Todo listo, {{nombre}}',
    finBody: 'Tu panel ya está configurado. Empieza por cargar tu plantel: el resto de los módulos se apoyan en él.',
    finBodyConCentro: 'Ya creamos {{centro}}. Empieza por cargar tu plantel: el resto de los módulos se apoyan en él.',
    finEntrar: 'Entrar al panel',
    // Etiquetas de opciones
    cargo: {
      preparador_fisico: 'Preparador físico',
      entrenador: 'Entrenador / DT',
      analista: 'Analista de rendimiento',
      coordinador: 'Coordinador deportivo',
      director_deportivo: 'Director deportivo',
      dueno: 'Dueño / directivo del club',
      fisioterapeuta: 'Fisioterapeuta / kinesiólogo',
      medico: 'Médico deportivo',
      nutricionista: 'Nutricionista deportivo',
      psicologo: 'Psicólogo deportivo',
      atleta: 'Atleta independiente',
      profesor_ef: 'Profesor de educación física',
      director_institucion: 'Director de la institución',
      entrenador_personal: 'Entrenador personal',
      otro: 'Otro',
    },
    disciplina: {
      futbol: 'Fútbol',
      futsal: 'Futsal',
      basquet: 'Básquetbol',
      voley: 'Vóleibol',
      handball: 'Handball',
      rugby: 'Rugby',
      atletismo: 'Atletismo',
      natacion: 'Natación',
      ciclismo: 'Ciclismo',
      tenis: 'Tenis',
      combate: 'Deportes de combate',
      multideporte: 'Multideporte',
      otro: 'Otro',
    },
    tamano: {
      solo_1: 'Solo 1 atleta',
      solo_1_hint: 'Seguimiento individual',
      '2_15': '2 a 15',
      '2_15_hint': 'Grupo reducido',
      '16_30': '16 a 30',
      '16_30_hint': 'Un plantel',
      '31_60': '31 a 60',
      '31_60_hint': 'Varias categorías',
      '61_mas': 'Más de 60',
      '61_mas_hint': 'Club completo',
    },
    necesidad: {
      rendimiento: 'Seguimiento de rendimiento',
      rendimiento_hint: 'Métricas por atleta a lo largo de la temporada',
      lesiones: 'Control y prevención de lesiones',
      lesiones_hint: 'Historial, zonas afectadas y retorno al juego',
      tests: 'Tests y evaluaciones físicas',
      tests_hint: 'Batería de pruebas con cálculo automático',
      carga: 'Carga de entrenamiento',
      carga_hint: 'sRPE, carga aguda/crónica y ACWR',
      planificacion: 'Planificación y periodización',
      planificacion_hint: 'Macro, meso y microciclos de la temporada',
      gps: 'Datos GPS',
      gps_hint: 'Distancias, velocidades y carga externa',
      psicologico: 'Bienestar y psicología',
      psicologico_hint: 'Cuestionarios de ánimo y recuperación',
      calendario: 'Calendario de temporada',
      calendario_hint: 'Partidos, torneos y concentraciones',
      reportes: 'Reportes e informes',
      reportes_hint: 'Documentos para cuerpo técnico y dirigencia',
      asesor_ia: 'Asesor con IA',
      asesor_ia_hint: 'Lectura de tus datos y sugerencias de sesión',
    },
    canal: {
      recomendacion: 'Recomendación de un colega',
      equipo_zyfit: 'Contacto del equipo Zyfit',
      redes: 'Redes sociales',
      buscador: 'Búsqueda en internet',
      evento: 'Congreso, curso o evento',
      academy: 'Zyfit Academy',
      prensa: 'Prensa deportiva',
      otro: 'Otro',
    },
  },
  login: {
    accesoProfesional: 'Acceso profesional',
    title: 'Accede a tu portal',
    noTienesAcceso: '¿No tienes acceso aún?',
    contactanos: 'Contáctanos',
    correo: 'Correo electrónico',
    contrasena: 'Contraseña',
    olvidasteContrasena: '¿Olvidaste tu contraseña?',
    portalInvitado: 'Portal Invitado',
    accediendo: 'Accediendo…',
    acceder: 'Acceder',
    contactarSoporte: 'Contactar a soporte',
    errorLogin: 'No se pudo iniciar sesión. Verifica tus credenciales y tu acceso al panel.',
    mostrar: 'Mostrar',
    ocultar: 'Ocultar',
    mostrarContrasena: 'Mostrar contraseña',
    ocultarContrasena: 'Ocultar contraseña',
  },
  forgotPassword: {
    recuperarAcceso: 'Recuperar acceso',
    titleEmail: '¿Olvidaste tu contraseña',
    titleVerify: 'Ingresa el código',
    step1Body: 'Ingresa tu correo y te enviaremos un código para restablecerla.',
    volver: 'Volver a iniciar sesión',
    correo: 'Correo electrónico',
    enviando: 'Enviando…',
    enviarCodigo: 'Enviar código',
    step2Body: 'Enviamos un código a {{email}}. Ingrésalo junto con tu nueva contraseña.',
    codigo: 'Código de verificación',
    nuevaContrasena: 'Nueva contraseña',
    confirmarContrasena: 'Confirmar contraseña',
    actualizando: 'Actualizando…',
    cambiarContrasena: 'Cambiar contraseña',
    noRecibisteCodigo: '¿No recibiste el código? Reenviar',
    listoTitle: 'Contraseña actualizada',
    listoBody: 'Ya puedes iniciar sesión con tu nueva contraseña.',
    irAIniciarSesion: 'Ir a iniciar sesión',
    errorCodigoInvalido: 'El código ingresado no es válido o expiró.',
    errorContrasenaCorta: 'La contraseña debe tener al menos 8 caracteres.',
    errorNoCoinciden: 'Las contraseñas no coinciden.',
    mostrarContrasena: 'Mostrar contraseña',
    ocultarContrasena: 'Ocultar contraseña',
    mostrar: 'Mostrar',
    ocultar: 'Ocultar',
  },
}

export default es
export type Dictionary = typeof es
