// English dictionary — mirrors dictionaries/es.ts key by key. `satisfies`
// keeps this file honest against the Spanish shape without widening the
// type of `es` itself (see useT.ts, which falls back to `es` for any gap).
import type { Dictionary } from './es'

const en = {
  header: {
    audience: {
      label: "Who it's for",
      equipos: 'Sports teams',
      atletas: 'High-performance athletes',
      instituciones: 'Educational institutions',
    },
    precio: 'Pricing',
    login: 'Log in',
    register: 'Sign up',
    languageLabel: 'Language',
  },
  footer: {
    tag: 'Performance',
    contact: 'Contact',
    copyright: '© {{year}} Zyfit Performance',
  },
  modules: {
    rendimiento: {
      name: 'Performance',
      body: 'Internal load, form (fitness-fatigue) and ACWR tracked per athlete and per team.',
    },
    lesiones: {
      name: 'Injuries',
      body: 'Body-map logging, recovery tracking, and risk context for the rest of the panel.',
    },
    tests: {
      name: 'Physical tests',
      body: 'Standard batteries —Bangsbo IR2, Draper & Whyte RAST, among others— calculated on the server.',
    },
    planificacion: {
      name: 'Planning',
      body: 'Team meso- and microcycles, with a read-only advisor that suggests adjustments based on load and injuries.',
    },
    psicologico: {
      name: 'Psychological',
      body: "BRUMS/POMS, RESTQ-Sport, CSAI-2 and ABQ — sport psychometrics alongside the rest of the athlete's data.",
    },
    simulador: {
      name: 'Tactical simulator',
      body: 'Animated tactical board, football or futsal, to prepare and share plays with the squad.',
    },
    calendario: {
      name: 'Calendar',
      body: 'Tournaments, training camps, matches and sessions for the whole season on a single timeline.',
    },
  },
  landing: {
    hero: {
      rail: {
      pais: 'Country',
      cargo: 'Role',
      plantel: 'Squad',
      necesidades: 'Needs',
      canal: 'Source',
      centro: 'Center',
    },
    eyebrow: 'B2B panel · High-performance sports',
      titleLine1: 'Sports science,',
      titleLine2: 'in a single panel',
      body: 'Performance, injuries, physical tests, planning and psychological — a panel for sports teams, educational institutions and high-performance athletes.',
      ctaPrimary: 'Request access',
      ctaSecondary: 'I already have access · Log in',
    },
    audienceSection: {
      eyebrow: "Who it's for",
      title: 'Built for those who take performance seriously',
      equipos: {
        title: 'Sports teams',
        body: 'Football and futsal clubs and centers that need their whole technical staff —physical, medical, tactical and psychological— coordinated in a single panel.',
      },
      instituciones: {
        title: 'Educational institutions',
        body: 'Schools and sports academies that train young athletes and need objective tracking of load, tests and progress across seasons.',
      },
      atletas: {
        title: 'High-performance athletes',
        body: 'Individual athletes who train with their own technical staff and want their load, test and recovery data in one place.',
      },
    },
    modulesSection: {
      eyebrow: 'Modules',
      title: 'The whole technical staff, in one place',
      subtitle:
        'Each role —head coach, physical trainer, physiotherapist, analyst, planner, psychologist— accesses only what belongs to them.',
    },
    methodology: {
      eyebrow: 'Methodology',
      title: '25 calculators with cited science, not a black box',
      p1: "Every formula in the panel —sRPE, Foster's monotony and strain, ACWR (acute:chronic) in its rolling-average and EWMA variants, Edwards' TRIMP, form (Banister-style fitness-fatigue)— is documented and always calculated on the server. Staff never depend on a separate spreadsheet.",
      p2: "We're honest about the limits: ACWR is a contextual load indicator, not a causal predictor of injury. The panel gives the number and the context — the decision still belongs to the technical staff.",
      bullets: {
        0: '25 calculators + a complete psychometric battery (BRUMS/POMS/RESTQ-Sport/CSAI-2/ABQ)',
        1: 'All calculations live on the server — the panel never improvises a number',
        2: 'Independent staff roles per center, with access by module',
      },
    },
    engine: {
      eyebrow: 'Calculation engine',
      title: 'No formula is a black box — try them yourself',
      subtitle:
        "Pick a calculator, enter your numbers and see the result — the same formulas the real panel uses for every athlete.",
      calculators: {
        acwr: 'ACWR',
        srpe: 'Session load (sRPE)',
        sayers: 'Jump power (Sayers)',
      },
      acwr: {
        fieldAguda: 'Acute load',
        unitAguda: '7 days',
        fieldCronica: 'Chronic load',
        unitCronica: '4-wk avg',
        placeholder: 'Enter both values',
        zoneRiesgo: 'Elevated risk',
        zoneAtencion: 'Caution zone',
        zoneOptima: 'Optimal zone (sweet spot)',
        zoneBaja: 'Below the optimal range',
        disclaimer:
          "Simplified view for demonstration purposes — in the real panel, ACWR is calculated per athlete and per team, in rolling-average and EWMA variants, and is automatically cross-referenced with injuries and planning. It doesn't replace the technical staff's daily monitoring.",
      },
      srpe: {
        fieldRpe: 'Perceived RPE',
        unitRpe: '0–10, Borg CR-10',
        fieldDuracion: 'Duration',
        unitDuracion: 'minutes',
        resultLabel: 'Session internal load',
        disclaimer:
          'RPE × duration (Foster/Borg CR-10) — the same calculation the Internal load module logs, session by session. The real panel accumulates it day by day to calculate monotony, strain and ACWR.',
      },
      sayers: {
        fieldAltura: 'Jump height',
        unitAltura: 'cm',
        fieldMasa: 'Body mass',
        unitMasa: 'kg',
        resultLabel: 'Estimated peak power (Squat Jump)',
        disclaimer:
          "Sayers et al. (1999) formula: 60.7 × height(cm) + 45.3 × mass(kg) − 2055. The panel can also calculate height directly from the jump's flight time.",
      },
    },
    howItWorks: {
      eyebrow: 'How it works',
      title: 'From new center to data-driven decisions',
      steps: {
        0: {
          title: 'The director registers the center',
          body: 'The sports center is created and staff are added with their corresponding role — head coach, physical trainer, physiotherapist, analyst, planner or psychologist.',
        },
        1: {
          title: 'Each role logs their data',
          body: "Tests, sessions, injuries and psychological assessments are logged where they happen, not in a separate spreadsheet at the end of the week.",
        },
        2: {
          title: 'The panel returns context, not just numbers',
          body: 'ACWR, form, risk and planning are automatically cross-referenced so the technical staff decides with data, not just perception.',
        },
      },
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'What centers ask us the most',
      items: {
        0: {
          q: 'Is the panel for athletes or for the technical staff?',
          a: "It's for staff: head coach, physical trainer, physiotherapist, analyst, planner and psychologist. Athletes don't log in — the director or staff registers them within each center.",
        },
        1: {
          q: 'Does it work for football and futsal?',
          a: 'Yes, the tactical simulator and data logging cover both disciplines by design.',
        },
        2: {
          q: "Who sees each athlete's data?",
          a: "Access is by module and by role within each center — a physical trainer, for example, doesn't see psychological assessments if that module isn't enabled for their role.",
        },
        3: {
          q: 'How do we add a new center to the panel?',
          a: "Contact us and we'll coordinate onboarding your center and your technical staff's roles — access is currently managed directly with our team, it's not self-service.",
        },
      },
    },
    ctaFinal: {
      title: 'Ready to professionalize your technical staff?',
      body: "Contact us and we'll coordinate onboarding your sports center and your staff's roles.",
      cta: 'Request access',
    },
    testCarousel: {
      label: 'Physical test',
      badge: 'Example',
      slides: {
        0: {
          name: 'Squat Jump',
          body: 'Jump without countermovement — estimates lower-body power from the height reached.',
          unit: '≈ 3.5 kW',
        },
        1: {
          name: '10 m Sprint',
          body: 'Initial acceleration capacity over the first meters of a linear run.',
          unit: 'time',
        },
        2: {
          name: 'RSI · Drop Jump',
          body: 'Reactive strength index: jump height divided by ground contact time.',
          unit: 'index',
        },
      },
    },
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'A plan for every profile',
    subtitle:
      "Access is coordinated directly with our team — no card, no self-service. Contact us and we'll put together the plan based on your center, your staff and the modules you need.",
    mostElegido: 'Most popular',
    aMedida: 'Custom',
    contactanos: '/ contact us',
    solicitarAcceso: 'Request access',
    verMas: 'See more for this profile',
    plans: {
      atleta: {
        name: 'Individual athlete',
        audience: 'For athletes who train with their own technical staff.',
        features: {
          0: 'Performance — internal load, ACWR and form',
          1: 'Physical tests with cited formulas',
          2: 'Psychological — BRUMS/POMS, RESTQ-Sport, CSAI-2, ABQ',
          3: 'Injuries with body map and tracking',
        },
      },
      equipo: {
        name: 'Team',
        audience: 'For football and futsal clubs and centers.',
        features: {
          0: 'All 5 full modules, with independent staff roles',
          1: 'Planning with AI-generated team sessions',
          2: 'Tactical simulator and season calendar',
          3: 'Read-only planning advisor',
        },
      },
      institucion: {
        name: 'Institution',
        audience: 'For schools and youth sports academies.',
        features: {
          0: 'Everything in the Team plan, by category and age group',
          1: 'Comparable tracking season after season',
          2: 'Reports to show families and administrators',
          3: 'Multiple centers under the same institution',
        },
      },
    },
    ctaTitle: 'Not sure which plan is yours?',
    ctaBody: "Tell us how your technical staff is organized and we'll help you choose.",
  },
  audience: {
    solicitarAcceso: 'Request access',
    verPlanes: 'See plans',
    modulosRelevantes: 'Relevant modules',
    loQueVasAUsar: "What you'll use every day",
    segments: {
      equipos: {
        eyebrow: 'For sports teams',
        title: 'Your whole technical staff, coordinated in a single panel.',
        subtitle:
          'Football and futsal clubs and centers that need their entire staff —physical, medical, tactical and psychological— working on the same data, not on separate spreadsheets.',
        benefits: {
          0: {
            title: 'One squad, every role',
            body: 'Head coach, physical trainer, physiotherapist, analyst, planner and psychologist access the same squad, each one only the modules that belong to them.',
          },
          1: {
            title: 'AI-generated team sessions',
            body: 'The planner builds meso- and microcycles by team —not by athlete, because football and futsal train together— with a read-only advisor that suggests adjustments based on load and injuries.',
          },
          2: {
            title: 'Injury risk with context, not just the medical report',
            body: "ACWR and load are automatically cross-referenced with each player's status, so the technical staff decides with data, not just an isolated diagnosis.",
          },
          3: {
            title: 'Tactical simulator included',
            body: 'Animated tactical board for football or futsal, to prepare and share plays with the squad — available to all staff, with no module gating.',
          },
        },
        closingTitle: 'Ready to professionalize your technical staff?',
        closingBody: "Contact us and we'll coordinate onboarding your sports center and your staff's roles.",
      },
      atletas: {
        eyebrow: 'For high-performance athletes',
        title: 'Your load, your tests and your recovery, in one place.',
        subtitle:
          'Individual athletes who train with their own technical staff —physical trainer, physiotherapist, psychologist— and want to see their data cross-referenced, not scattered across separate apps.',
        note: "You don't log your own data: your trainer or physiotherapist registers you within their panel, the same way a club would with its squad — so your whole technical team works on the same information. Athletes don't log in directly.",
        benefits: {
          0: {
            title: 'Your ACWR and your form, always up to date',
            body: "Internal load (sRPE), monotony, strain and form (fitness-fatigue) calculated on the server, session by session — not a spreadsheet someone has to update by hand.",
          },
          1: {
            title: 'Physical tests with cited formulas',
            body: 'Squat Jump, Sprint, RSI and the rest of the physical battery with the same documented formulas a club uses — Sayers, Bangsbo IR2, Draper & Whyte RAST, among others.',
          },
          2: {
            title: 'The psychological, alongside the physical',
            body: 'BRUMS/POMS, RESTQ-Sport, CSAI-2 and ABQ — your mental state next to your training load, not in a separate consultation.',
          },
          3: {
            title: 'Injury history with context',
            body: "Body-map logging and recovery tracking, visible to your whole technical team — not just whoever treated you that day.",
          },
        },
        closingTitle: 'Ready for your technical team to train with data?',
        closingBody: "Contact us and we'll coordinate onboarding you and your technical staff within the panel.",
      },
      instituciones: {
        eyebrow: 'For educational institutions',
        title: 'Objective tracking of your young athletes, season after season.',
        subtitle:
          'Schools and sports academies that train young athletes and need to see their load, test and development progress across multiple seasons — not just one tournament.',
        benefits: {
          0: {
            title: 'Physical tests comparable over time',
            body: 'The same test battery, with the same formulas, repeated season after season — to see real progress for each student, not just an isolated snapshot.',
          },
          1: {
            title: 'The whole season on one timeline',
            body: "Tournaments, training camps, matches and sessions organized alongside each category's real load.",
          },
          2: {
            title: 'Planning by category',
            body: 'Team meso- and microcycles, adapted to each youth category, with a read-only advisor that suggests adjustments based on load and injuries.',
          },
          3: {
            title: 'Reports for families and administrators',
            body: "Objective performance and development data, not just the coach's perception — useful internally and to communicate results.",
          },
        },
        closingTitle: "Ready to bring your institution's tracking into a single panel?",
        closingBody: "Contact us and we'll coordinate onboarding your institution and your staff's roles.",
      },
    },
  },
  onboarding: {
    // Wizard header and navigation
    eyebrow: 'Initial setup',
    pasoDe: 'Step {{actual}} of {{total}}',
    continuar: 'Continue',
    atras: 'Back',
    guardando: 'Saving…',
    empezar: 'Start',
    finalizar: 'Finish',
    errorGuardar: "We couldn't save your answer. Check your connection and try again.",
    reintentar: 'Try again',
    cerrarSesion: 'Sign out',
    // Step 0 — intro
    introTitle: 'Hi, {{nombre}}',
    introBody: 'Before we open the panel we want to understand how you work. Five questions, under a minute.',
    introPunto1: 'We arrange the panel around your sport and squad size.',
    introPunto2: 'We prioritize the modules you actually came for.',
    introPunto3: 'It tells us who is using Performance, and from where.',
    // Step 1 — country
    paisTitle: 'Which country do you work from?',
    paisBody: 'We use it for calendar time zones and to know where Performance is growing.',
    paisLabel: 'Country',
    paisBuscar: 'Search for your country',
    paisSinResultados: 'No country matches that search.',
    paisSugeridos: 'Suggested',
    paisTodos: 'All countries',
    // Step 2 — role
    cargoTitle: "What's your role?",
    cargoBody: 'It sets what your panel shows first, and in how much detail.',
    cargoOtroLabel: 'Tell us your role',
    cargoOtroPlaceholder: 'e.g. Return-to-play specialist',
    // Step 3 — sport and squad
    planteTitle: 'Who do you work with?',
    planteBody: 'Sport and group size change which metrics are worth showing you.',
    disciplinaLabel: 'Main sport',
    disciplinaOtroLabel: 'Tell us which one',
    disciplinaOtroPlaceholder: 'e.g. Field hockey',
    tamanoLabel: 'How many athletes do you track?',
    // Step 4 — needs
    necesidadesTitle: 'What do you need to solve?',
    necesidadesBody: "Check everything that applies. You can change it later — it doesn't lock any module.",
    necesidadesOpcional: 'You can continue without checking anything.',
    necesidadesSeleccionadas: '{{n}} selected',
    necesidadesUna: '1 selected',
    // Step 5 — channel
    canalTitle: 'How did you find Zyfit Performance?',
    canalBody: 'Last one. It helps us know what is worth keeping up.',
    canalOtroLabel: 'Tell us how',
    canalOtroPlaceholder: 'e.g. A YouTube video',
    // Step 6 — create center (only for directors/admins with no center yet)
    centroTitle: 'Create your sports center',
    centroBody: 'It is where your squad, tests and planning live. You will be its technical director and can add staff later.',
    centroOmitir: "I'll create it later",
    centroCreado: 'Center created',
    // Closing
    finTitle: "You're all set, {{nombre}}",
    finBody: 'Your panel is configured. Start by loading your squad: every other module builds on it.',
    finBodyConCentro: 'We created {{centro}}. Start by loading your squad: every other module builds on it.',
    finEntrar: 'Go to the panel',
    // Option labels
    cargo: {
      preparador_fisico: 'Strength & conditioning coach',
      entrenador: 'Head coach',
      analista: 'Performance analyst',
      coordinador: 'Youth academy coordinator',
      director_deportivo: 'Sporting director',
      dueno: 'Club owner / board member',
      fisioterapeuta: 'Physiotherapist',
      medico: 'Sports physician',
      nutricionista: 'Sports nutritionist',
      psicologo: 'Sports psychologist',
      atleta: 'Independent athlete',
      otro: 'Other',
    },
    disciplina: {
      futbol: 'Football',
      futsal: 'Futsal',
      basquet: 'Basketball',
      voley: 'Volleyball',
      handball: 'Handball',
      rugby: 'Rugby',
      atletismo: 'Track & field',
      natacion: 'Swimming',
      ciclismo: 'Cycling',
      tenis: 'Tennis',
      combate: 'Combat sports',
      multideporte: 'Multi-sport',
      otro: 'Other',
    },
    tamano: {
      solo_1: 'Just 1 athlete',
      solo_1_hint: 'Individual tracking',
      '2_15': '2 to 15',
      '2_15_hint': 'Small group',
      '16_30': '16 to 30',
      '16_30_hint': 'One squad',
      '31_60': '31 to 60',
      '31_60_hint': 'Several age groups',
      '61_mas': 'More than 60',
      '61_mas_hint': 'Whole club',
    },
    necesidad: {
      rendimiento: 'Performance tracking',
      rendimiento_hint: 'Per-athlete metrics across the season',
      lesiones: 'Injury control and prevention',
      lesiones_hint: 'History, affected areas and return to play',
      tests: 'Physical tests and assessments',
      tests_hint: 'Test battery with automatic scoring',
      carga: 'Training load',
      carga_hint: 'sRPE, acute/chronic load and ACWR',
      planificacion: 'Planning and periodization',
      planificacion_hint: 'Macro, meso and microcycles of the season',
      gps: 'GPS data',
      gps_hint: 'Distances, speeds and external load',
      psicologico: 'Wellbeing and psychology',
      psicologico_hint: 'Mood and recovery questionnaires',
      calendario: 'Season calendar',
      calendario_hint: 'Matches, tournaments and training camps',
      reportes: 'Reports',
      reportes_hint: 'Documents for coaching staff and the board',
      asesor_ia: 'AI advisor',
      asesor_ia_hint: 'Reads your data and suggests sessions',
    },
    canal: {
      recomendacion: 'A colleague recommended it',
      equipo_zyfit: 'The Zyfit team reached out',
      redes: 'Social media',
      buscador: 'Internet search',
      evento: 'Conference, course or event',
      academy: 'Zyfit Academy',
      prensa: 'Sports press',
      otro: 'Other',
    },
  },
  login: {
    accesoProfesional: 'Professional access',
    title: 'Access your portal',
    noTienesAcceso: "Don't have access yet?",
    contactanos: 'Contact us',
    correo: 'Email',
    contrasena: 'Password',
    olvidasteContrasena: 'Forgot your password?',
    portalInvitado: 'Guest Portal',
    accediendo: 'Signing in…',
    acceder: 'Sign in',
    contactarSoporte: 'Contact support',
    errorLogin: "We couldn't sign you in. Check your credentials and your access to the panel.",
    mostrar: 'Show',
    ocultar: 'Hide',
    mostrarContrasena: 'Show password',
    ocultarContrasena: 'Hide password',
  },
  forgotPassword: {
    recuperarAcceso: 'Recover access',
    titleEmail: 'Forgot your password',
    titleVerify: 'Enter the code',
    step1Body: "Enter your email and we'll send you a code to reset it.",
    volver: 'Back to sign in',
    correo: 'Email',
    enviando: 'Sending…',
    enviarCodigo: 'Send code',
    step2Body: "We sent a code to {{email}}. Enter it along with your new password.",
    codigo: 'Verification code',
    nuevaContrasena: 'New password',
    confirmarContrasena: 'Confirm password',
    actualizando: 'Updating…',
    cambiarContrasena: 'Change password',
    noRecibisteCodigo: "Didn't receive the code? Resend",
    listoTitle: 'Password updated',
    listoBody: 'You can now sign in with your new password.',
    irAIniciarSesion: 'Go to sign in',
    errorCodigoInvalido: 'The code you entered is invalid or has expired.',
    errorContrasenaCorta: 'The password must be at least 8 characters long.',
    errorNoCoinciden: "The passwords don't match.",
    mostrarContrasena: 'Show password',
    ocultarContrasena: 'Hide password',
    mostrar: 'Show',
    ocultar: 'Hide',
  },
} satisfies Dictionary

export default en
