// Mapa de rutas de la academia. Login público + rutas protegidas bajo el layout.

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { CatalogPage } from '@/pages/CatalogPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
import { MyLearningPage } from '@/pages/MyLearningPage'
import { InstructorPage } from '@/pages/InstructorPage'
import { CertificatesPage } from '@/pages/CertificatesPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/catalogo" replace /> },
          { path: 'catalogo', element: <CatalogPage /> },
          { path: 'cursos/:courseId', element: <CourseDetailPage /> },
          { path: 'aprendizaje', element: <MyLearningPage /> },
          { path: 'certificados', element: <CertificatesPage /> },
          { path: 'instructor', element: <InstructorPage /> },
          { path: 'perfil', element: <ProfilePage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
