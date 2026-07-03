// Mapa de rutas de la academia. Login público + rutas protegidas bajo el layout.

import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { TermsPage } from '@/pages/TermsPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { ExploreCatalogPage } from '@/pages/ExploreCatalogPage'
import { ExploreCourseDetailPage } from '@/pages/ExploreCourseDetailPage'
import { ExploreLessonPage } from '@/pages/ExploreLessonPage'
import { HomePage } from '@/pages/HomePage'
import { CatalogPage } from '@/pages/CatalogPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
import { LessonPlayerPage } from '@/pages/LessonPlayerPage'
import { MyLearningPage } from '@/pages/MyLearningPage'
import { InstructorPage } from '@/pages/InstructorPage'
import { CourseContentPage } from '@/pages/CourseContentPage'
import { SubmissionsPage } from '@/pages/SubmissionsPage'
import { CertificatesPage } from '@/pages/CertificatesPage'
import { CommunityPage } from '@/pages/CommunityPage'
import { QuestionDetailPage } from '@/pages/QuestionDetailPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SubscriptionPage } from '@/pages/SubscriptionPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  // Landing pública: visitantes sin sesión ven marketing + CTAs a login/registro/
  // explorar; usuarios logueados son redirigidos a /inicio (useRedirectIfAuthenticated).
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegisterPage /> },
  { path: '/recuperar', element: <ForgotPasswordPage /> },
  { path: '/terminos', element: <TermsPage /> },
  { path: '/privacidad', element: <PrivacyPage /> },
  // Onboarding sin registro: catálogo y contenido gratis navegables sin cuenta
  // (ver academy.anon_views, backend) — fuera de ProtectedRoute a propósito.
  { path: '/explorar', element: <ExploreCatalogPage /> },
  { path: '/explorar/cursos/:courseId', element: <ExploreCourseDetailPage /> },
  { path: '/explorar/cursos/:courseId/lecciones/:lessonId', element: <ExploreLessonPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      // Reproductor a pantalla completa (modo enfoque): fuera de AppLayout.
      { path: 'aprender/:enrollmentId', element: <LessonPlayerPage /> },
      {
        element: <AppLayout />,
        children: [
          { path: 'inicio', element: <HomePage /> },
          { path: 'catalogo', element: <CatalogPage /> },
          { path: 'cursos/:courseId', element: <CourseDetailPage /> },
          { path: 'aprendizaje', element: <MyLearningPage /> },
          { path: 'certificados', element: <CertificatesPage /> },
          { path: 'comunidad', element: <CommunityPage /> },
          { path: 'comunidad/:postId', element: <QuestionDetailPage /> },
          { path: 'instructor', element: <InstructorPage /> },
          { path: 'instructor/cursos/:courseId/contenido', element: <CourseContentPage /> },
          { path: 'instructor/cursos/:courseId/entregas', element: <SubmissionsPage /> },
          { path: 'perfil', element: <ProfilePage /> },
          { path: 'suscripcion', element: <SubscriptionPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
