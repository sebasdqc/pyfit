// Raíz de la app: providers globales (React Query + Auth) y el router.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { ActiveCenterProvider } from '@/centers/ActiveCenterContext'
import { SquadProvider } from '@/centers/SquadContext'
import { LocaleProvider } from '@/locale/LocaleContext'
import { router } from '@/router'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <ActiveCenterProvider>
            <SquadProvider>
              <RouterProvider router={router} />
            </SquadProvider>
          </ActiveCenterProvider>
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>
  )
}
