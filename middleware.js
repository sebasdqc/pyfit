import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const rutasProtegidas = ['/dashboard', '/checkin', '/generate', '/feedback', '/ejecutar', '/onboarding', '/historial', '/perfil', '/estadisticas']
  const rutasAuth = ['/auth']
  const path = request.nextUrl.pathname
  const estaEnRutaProtegida = rutasProtegidas.some(r => path.startsWith(r))
  const estaEnRutaAuth = rutasAuth.some(r => path.startsWith(r))

  if (estaEnRutaProtegida && !user) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  if (estaEnRutaAuth && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets|api).*)'],
}