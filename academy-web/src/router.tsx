// Mapa de rutas de la academia. Login público + rutas protegidas bajo el layout.

import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'

import { LoadingScreen } from '@/components/ui/LoadingScreen'

// Carga bajo demanda: cada página es su propio bloque y solo se descarga al
// entrar a ella. Antes todo (landing, simuladores, paneles de admin...) viajaba
// en un único archivo de ~940 kB. Se mantienen cargadas de entrada solo las rutas
// por donde llega casi todo el mundo (landing, login, registro) y el layout.
// `HydrateFallback` pinta la pantalla de carga mientras llega el bloque inicial.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageModule = Record<string, any>
const page = (load: () => Promise<PageModule>, name: string) => ({
  lazy: async () => ({ Component: (await load())[name] }),
  HydrateFallback: LoadingScreen,
})

export const router = createBrowserRouter([
  // Landing pública: visitantes sin sesión ven marketing + CTAs a login/registro/
  // explorar; usuarios logueados son redirigidos a /inicio (useRedirectIfAuthenticated).
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegisterPage /> },
  { path: '/recuperar', ...page(() => import('@/pages/ForgotPasswordPage'), 'ForgotPasswordPage') },
  { path: '/terminos', ...page(() => import('@/pages/TermsPage'), 'TermsPage') },
  { path: '/privacidad', ...page(() => import('@/pages/PrivacyPage'), 'PrivacyPage') },
  // Onboarding sin registro: catálogo y contenido gratis navegables sin cuenta
  // (ver academy.anon_views, backend) — fuera de ProtectedRoute a propósito.
  { path: '/explorar', ...page(() => import('@/pages/ExploreCatalogPage'), 'ExploreCatalogPage') },
  { path: '/explorar/cursos/:courseId', ...page(() => import('@/pages/ExploreCourseDetailPage'), 'ExploreCourseDetailPage') },
  { path: '/explorar/cursos/:courseId/lecciones/:lessonId', ...page(() => import('@/pages/ExploreLessonPage'), 'ExploreLessonPage') },
  // Blog: contenido de marketing/SEO, público CON o SIN cuenta (a diferencia
  // de /explorar, no redirige a un usuario logueado — ver BlogPage.tsx).
  { path: '/blog', ...page(() => import('@/pages/BlogPage'), 'BlogPage') },
  { path: '/blog/:slug', ...page(() => import('@/pages/BlogPostPage'), 'BlogPostPage') },
  {
    element: <ProtectedRoute />,
    children: [
      // Reproductor a pantalla completa (modo enfoque): fuera de AppLayout.
      { path: 'aprender/:enrollmentId', ...page(() => import('@/pages/LessonPlayerPage'), 'LessonPlayerPage') },
      // Onboarding inicial (wizard a pantalla completa): fuera de AppLayout.
      { path: 'bienvenida', ...page(() => import('@/pages/OnboardingPage'), 'OnboardingPage') },
      {
        element: <AppLayout />,
        children: [
          { path: 'inicio', ...page(() => import('@/pages/HomePage'), 'HomePage') },
          { path: 'catalogo', ...page(() => import('@/pages/CatalogPage'), 'CatalogPage') },
          { path: 'cursos/:courseId', ...page(() => import('@/pages/CourseDetailPage'), 'CourseDetailPage') },
          { path: 'aprendizaje', ...page(() => import('@/pages/MyLearningPage'), 'MyLearningPage') },
          { path: 'repaso', ...page(() => import('@/pages/ReviewPage'), 'ReviewPage') },
          { path: 'biblioteca', ...page(() => import('@/pages/LibraryPage'), 'LibraryPage') },
          { path: 'certificados', ...page(() => import('@/pages/CertificatesPage'), 'CertificatesPage') },
          { path: 'simulador', ...page(() => import('@/pages/SimuladorIndexPage'), 'SimuladorIndexPage') },
          { path: 'simulador/carga', ...page(() => import('@/pages/SimuladorCargaPage'), 'SimuladorCargaPage') },
          { path: 'simulador/sesion', ...page(() => import('@/pages/SimuladorSesionPage'), 'SimuladorSesionPage') },
          { path: 'simulador/prevencion', ...page(() => import('@/pages/SimuladorPrevencionPage'), 'SimuladorPrevencionPage') },
          { path: 'comunidad', ...page(() => import('@/pages/CommunityPage'), 'CommunityPage') },
          { path: 'comunidad/:postId', ...page(() => import('@/pages/QuestionDetailPage'), 'QuestionDetailPage') },
          { path: 'instructor', ...page(() => import('@/pages/InstructorPage'), 'InstructorPage') },
          { path: 'instructor/analitica', ...page(() => import('@/pages/InstructorAnalyticsPage'), 'InstructorAnalyticsPage') },
          { path: 'instructor/blog', ...page(() => import('@/pages/BlogInstructorPage'), 'BlogInstructorPage') },
          { path: 'admin/usuarios', ...page(() => import('@/pages/AdminUsersPage'), 'AdminUsersPage') },
          { path: 'admin/metricas', ...page(() => import('@/pages/AdminMetricsPage'), 'AdminMetricsPage') },
          { path: 'admin/cobros', ...page(() => import('@/pages/AdminBillingPage'), 'AdminBillingPage') },
          { path: 'admin/medios', ...page(() => import('@/pages/AdminMediaPage'), 'AdminMediaPage') },
          { path: 'instructor/cursos/:courseId/contenido', ...page(() => import('@/pages/CourseContentPage'), 'CourseContentPage') },
          { path: 'instructor/cursos/:courseId/entregas', ...page(() => import('@/pages/SubmissionsPage'), 'SubmissionsPage') },
          { path: 'instructor/cursos/:courseId/ajustes', ...page(() => import('@/pages/CourseSettingsPage'), 'CourseSettingsPage') },
          { path: 'perfil', ...page(() => import('@/pages/ProfilePage'), 'ProfilePage') },
          { path: 'suscripcion', ...page(() => import('@/pages/SubscriptionPage'), 'SubscriptionPage') },
          { path: 'soporte', ...page(() => import('@/pages/SupportPage'), 'SupportPage') },
          { path: 'admin/soporte', ...page(() => import('@/pages/SupportAdminPage'), 'SupportAdminPage') },
          { path: 'admin/soporte/:studentId', ...page(() => import('@/pages/SupportAdminThreadPage'), 'SupportAdminThreadPage') },
        ],
      },
    ],
  },
  { path: '*', ...page(() => import('@/pages/NotFoundPage'), 'NotFoundPage') },
])
