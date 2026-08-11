// Mapa de rutas del panel. Rutas públicas (login) + rutas protegidas bajo el
// layout. Los cinco módulos viven anidados bajo un centro (/centers/:centerId/…).

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { PricingPage } from '@/pages/PricingPage'
import { AudiencePage } from '@/pages/AudiencePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProfilePage } from '@/pages/perfil/ProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RendimientoPage } from '@/pages/rendimiento/RendimientoPage'
import { LesionesPage } from '@/pages/lesiones/LesionesPage'
import { TestPage } from '@/pages/test/TestPage'
import { PlanificacionPage } from '@/pages/planificacion/PlanificacionPage'
import { PsicologicoPage } from '@/pages/psicologico/PsicologicoPage'
import { SimuladorPage } from '@/pages/simulador/SimuladorPage'
import { EquipoPage } from '@/pages/equipo/EquipoPage'
import { CalendarioPage } from '@/pages/calendario/CalendarioPage'
import { ReportesPage } from '@/pages/reportes/ReportesPage'
import { GpsPage } from '@/pages/gps/GpsPage'
import { MatchDayPage } from '@/pages/gps/MatchDayPage'
import { PostSessionPage } from '@/pages/gps/PostSessionPage'
import { WeeklyLoadPage } from '@/pages/gps/WeeklyLoadPage'
import { PlayerProfilePage } from '@/pages/gps/PlayerProfilePage'
import { CargaPage } from '@/pages/carga/CargaPage'
import { FormaPage } from '@/pages/forma/FormaPage'

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
      {
        element: <AppLayout />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'plantilla', element: <Navigate to="/equipo" replace /> },
          { path: 'equipo', element: <EquipoPage /> },
          { path: 'calendario', element: <CalendarioPage /> },
          { path: 'rendimiento', element: <RendimientoPage /> },
          { path: 'lesiones', element: <LesionesPage /> },
          { path: 'tests', element: <TestPage /> },
          { path: 'carga', element: <CargaPage /> },
          { path: 'forma', element: <FormaPage /> },
          { path: 'gps', element: <GpsPage /> },
          { path: 'gps/match-day', element: <MatchDayPage /> },
          { path: 'gps/post-sesion', element: <PostSessionPage /> },
          { path: 'gps/carga-semanal', element: <WeeklyLoadPage /> },
          { path: 'gps/jugador', element: <PlayerProfilePage /> },
          { path: 'planificacion', element: <PlanificacionPage /> },
          { path: 'psicologico', element: <PsicologicoPage /> },
          { path: 'simulador', element: <SimuladorPage /> },
          { path: 'reportes', element: <ReportesPage /> },
          { path: 'perfil', element: <ProfilePage /> },
          {
            path: 'centers/:centerId',
            children: [
              { path: 'rendimiento', element: <RendimientoPage /> },
              { path: 'lesiones', element: <LesionesPage /> },
              { path: 'test', element: <TestPage /> },
              { path: 'gps', element: <GpsPage /> },
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
  { path: '*', element: <NotFoundPage /> },
])
