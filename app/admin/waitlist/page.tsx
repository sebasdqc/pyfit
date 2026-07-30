import type { Metadata } from 'next'
import AdminLogin from './AdminLogin'
import LogoutButton from './LogoutButton'
import { isAdmin, listWaitlistSignups } from '../../lib/waitlist'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lista de espera — Zyfit',
  robots: { index: false, follow: false },
}

const FECHA = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
})

export default async function WaitlistAdminPage() {
  if (!(await isAdmin())) {
    return (
      <main className="bg-canvas min-h-screen flex items-center justify-center px-6 py-20">
        <AdminLogin />
      </main>
    )
  }

  const signups = await listWaitlistSignups()

  return (
    <main className="bg-canvas min-h-screen px-6 py-16">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-mono-label text-[11px] uppercase" style={{ color: 'var(--accent-light)' }}>
              Panel privado
            </span>
            <h1 className="display text-4xl mt-1">Lista de espera</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
              {signups.length === 0
                ? 'Todavía no se anotó nadie.'
                : `${signups.length} ${signups.length === 1 ? 'email guardado' : 'emails guardados'}.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {signups.length > 0 && (
              <a
                href="/api/waitlist/export"
                className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
                download
              >
                Descargar CSV
              </a>
            )}
            <LogoutButton />
          </div>
        </header>

        {signups.length > 0 && (
          <div className="glass-strong rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th
                      className="font-mono-label text-[11px] uppercase text-left px-5 py-3.5"
                      style={{ color: 'var(--ink-faint)', borderBottom: '1px solid var(--border)' }}
                    >
                      Email
                    </th>
                    <th
                      className="font-mono-label text-[11px] uppercase text-right px-5 py-3.5 whitespace-nowrap"
                      style={{ color: 'var(--ink-faint)', borderBottom: '1px solid var(--border)' }}
                    >
                      Se anotó
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {signups.map((s) => (
                    <tr key={s.id}>
                      <td
                        className="px-5 py-3.5 break-all"
                        style={{ color: 'var(--ink)', borderBottom: '1px solid var(--border)' }}
                      >
                        {s.email}
                      </td>
                      <td
                        className="px-5 py-3.5 text-right whitespace-nowrap"
                        style={{ color: 'var(--ink-dim)', borderBottom: '1px solid var(--border)' }}
                      >
                        {FECHA.format(new Date(s.created_at))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
