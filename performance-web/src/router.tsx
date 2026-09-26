// Mapa de rutas del panel. Rutas públicas (login) + rutas protegidas bajo el
// layout. Los cinco módulos viven anidados bajo un centro (/centers/:centerId/…).

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { OnboardingGate, OnboardingRoute } from '@/auth/OnboardingGate'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { PricingPage } from '@/pages/PricingPage'
import { AudiencePage } from '@/pages/AudiencePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProfilePage } from '@/pages/perfil/ProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LesionesPage } from '@/pages/lesiones/LesionesPage'
import { TestPage } from '@/pages/test/TestPage'
import { PlanificacionPage } from '@/pages/planificacion/PlanificacionPage'
import { PsicologicoPage } from '@/pages/psicologico/PsicologicoPage'
import { SimuladorPage } from '@/pages/simulador/SimuladorPage'
import { EquipoPage } from '@/pages/equipo/EquipoPage'
import { CalendarioPage } from '@/pages/calendario/CalendarioPage'
import { ReportesPage } from '@/pages/reportes/ReportesPage'
import { DataUnavailablePage } from '@/components/ui/DataUnavailablePage'
import { CargaPage } from '@/pages/carga/CargaPage'
import { FormaPage } from '@/pages/forma/FormaPage'
import { AsesorPage } from '@/pages/asesor/AsesorPage'
import { AjustesPage } from '@/pages/ajustes/AjustesPage'
import { CategoriasPage } from '@/pages/categorias/CategoriasPage'
import { ProteccionPage } from '@/pages/proteccion/ProteccionPage'
import { OnboardingPage } from '@/pages/OnboardingPage'

export const router = createBrowserRouter([
  // Landing pública: visitantes sin sesión ven el producto + CTAs a login/
  // contacto; un usuario ya logueado es redirigido a /dashboard (ver
  // useRedirectIfAuthenticated dentro de LandingPage).
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/recuperar', element: <ForgotPasswordPage /> },
  { path: '/precio', element: <PricingPage /> },
  { path: '/para-quien/:segment', element: <AudiencePage /> },
  {
    element: <ProtectedRoute />,
    children: [
      // Wizard de bienvenida: fuera de <AppLayout> (ocupa el viewport completo,
      // sin sidebar ni topbar) y fuera de <OnboardingGate>, que es justo quien
      // manda acá. <OnboardingRoute> impide volver a entrar una vez completado.
      {
        path: 'bienvenida',
        element: (
          <OnboardingRoute>
            <OnboardingPage />
          </OnboardingRoute>
        ),
      },
      {
        // Nadie llega al panel sin haber pasado por el onboarding.
        element: <OnboardingGate />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'plantilla', element: <Navigate to="/equipo" replace /> },
              { path: 'equipo', element: <EquipoPage /> },
              { path: 'calendario', element: <CalendarioPage /> },
              {
                path: 'rendimiento',
                element: <DataUnavailablePage title="Rendimiento" description="La carga interna ya está disponible; las métricas neuromusculares, autonómicas y externas aparecerán aquí cuando tengan captura persistida." action={{ label: 'Abrir Carga interna', to: '/carga', icon: 'carga' }} />,
              },
              { path: 'lesiones', element: <LesionesPage /> },
              { path: 'tests', element: <TestPage /> },
              { path: 'tests/:familia', element: <TestPage /> },
              { path: 'carga', element: <CargaPage /> },
              { path: 'forma', element: <FormaPage /> },
              { path: 'asesor', element: <AsesorPage /> },
              { path: 'gps', element: <DataUnavailablePage title="GPS y Tecnología" description="Conecta una fuente GPS para analizar sesiones, distancias, zonas de velocidad y carga externa." /> },
              { path: 'gps/match-day', element: <DataUnavailablePage title="Match Day" description="El monitoreo en vivo se habilitará cuando exista una transmisión GPS autenticada para el centro." /> },
              { path: 'gps/post-sesion', element: <DataUnavailablePage title="Post-sesión" description="Los informes post-sesión aparecerán después de importar o sincronizar una sesión GPS real." /> },
              { path: 'gps/carga-semanal', element: <DataUnavailablePage title="Carga semanal GPS" description="Esta vista requiere historial de carga externa. La carga interna real continúa disponible en su módulo." action={{ label: 'Abrir Carga interna', to: '/carga', icon: 'carga' }} /> },
              { path: 'gps/jugador', element: <DataUnavailablePage title="Perfil GPS" description="El perfil longitudinal se habilitará cuando el atleta tenga sesiones GPS persistidas." /> },
              { path: 'planificacion', element: <PlanificacionPage /> },
              { path: 'psicologico', element: <PsicologicoPage /> },
              { path: 'simulador', element: <SimuladorPage /> },
              { path: 'reportes', element: <ReportesPage /> },
              { path: 'perfil', element: <ProfilePage /> },
              { path: 'ajustes', element: <AjustesPage /> },
              { path: 'categorias', element: <CategoriasPage /> },
              { path: 'proteccion', element: <ProteccionPage /> },
              {
                path: 'centers/:centerId',
                children: [
                  { path: 'rendimiento', element: <DataUnavailablePage title="Rendimiento" description="Aún no hay una fuente persistida para estas métricas." action={{ label: 'Abrir Carga interna', to: '/carga', icon: 'carga' }} /> },
                  { path: 'lesiones', element: <LesionesPage /> },
                  { path: 'test', element: <TestPage /> },
                  { path: 'gps', element: <DataUnavailablePage title="GPS y Tecnología" description="Conecta una fuente GPS para mostrar datos reales del centro." /> },
                  { path: 'planificacion', element: <PlanificacionPage /> },
                  { path: 'psicologico', element: <PsicologicoPage /> },
                  { path: 'simulador', element: <SimuladorPage /> },
                  { path: 'calendario', element: <CalendarioPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
