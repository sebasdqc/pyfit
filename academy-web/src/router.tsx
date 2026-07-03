// Mapa de rutas de la academia. Login público + rutas protegidas bajo el layout.

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
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
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      // Reproductor a pantalla completa (modo enfoque): fuera de AppLayout.
      { path: 'aprender/:enrollmentId', element: <LessonPlayerPage /> },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/inicio" replace /> },
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
