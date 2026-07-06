// Reproductor público de una lección gratis (onboarding sin registro).
// Versión mínima adrede: sin temario/timer/quiz del reproductor autenticado
// (ver LessonPlayerPage) — solo lo necesario para "probar antes de registrarse".
// Si el visitante llega directo a una lección paga (URL a mano), el backend
// devuelve 403 requiere_registro y aquí se muestra el prompt de registro en
// vez del error crudo.

import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { completePublicLesson, getAnonSessionStatus, getPublicLesson } from '@/api/academy'
import { useRedirectIfAuthenticated } from '@/auth/useRedirectIfAuthenticated'
import { RegisterPromptDialog, type RegisterPromptReason } from '@/components/academy/RegisterPromptDialog'
import { Icon } from '@/components/Icon'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Spinner } from '@/components/ui/Spinner'
import { toEmbedUrl } from '@/lib/videoEmbed'
import { useT } from '@/locale/useT'
import type { Lesson } from '@/types'

export function ExploreLessonPage() {
  const t = useT()
  const { courseId, lessonId } = useParams()
  const cId = Number(courseId)
  const lId = Number(lessonId)
  const redirecting = useRedirectIfAuthenticated(`/cursos/${cId}`)
  const navigate = useNavigate()

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [bloqueada, setBloqueada] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completada, setCompletada] = useState(false)
  const [prompt, setPrompt] = useState<RegisterPromptReason | null>(null)
  const [completeError, setCompleteError] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setBloqueada(false)
    setCompletada(false)
    getPublicLesson(lId)
      .then((l) => active && setLesson(l))
      .catch((err) => {
        if (active && isAxiosError(err) && err.response?.status === 403) setBloqueada(true)
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [lId])

  if (redirecting) return <LoadingScreen />

  async function handleComplete() {
    setCompleting(true)
    setCompleteError(false)
    try {
      await completePublicLesson(lId)
      setCompletada(true)
      const status = await getAnonSessionStatus().catch(() => null)
      if (status?.todo_gratis_completado) {
        setPrompt('completo_gratis')
      } else {
        navigate(`/explorar/cursos/${cId}`)
      }
    } catch {
      setCompleteError(true)
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-surface-soft">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8 sm:px-10">
        <Link
          to={`/explorar/cursos/${cId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent"
        >
          <Icon name="chevronLeft" size={16} /> {t('exploreLesson.backToCourse')}
        </Link>

        {loading ? (
          <div className="flex justify-center py-24">
            <Spinner size={40} />
          </div>
        ) : bloqueada || !lesson ? (
          <RegisterPromptDialog reason="contenido_pago" onClose={() => navigate(`/explorar/cursos/${cId}`)} />
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-ink">{lesson.titulo}</h1>

            {lesson.tipo === 'video' ? (
              <VideoBody url={lesson.video_url} titulo={lesson.titulo} />
            ) : (
              <TextBody text={lesson.contenido} />
            )}

            <button
              type="button"
              onClick={handleComplete}
              disabled={completing || completada}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60 sm:w-auto sm:px-6"
            >
              {completada ? (
                <>
                  <Icon name="check" size={16} /> {t('exploreLesson.completed')}
                </>
              ) : completing ? (
                t('exploreLesson.saving')
              ) : (
                t('exploreLesson.markComplete')
              )}
            </button>

            {completeError && (
              <p role="alert" className="text-sm text-danger">
                {t('exploreLesson.saveError')}
              </p>
            )}
          </>
        )}
      </main>

      {prompt && (
        <RegisterPromptDialog reason={prompt} onClose={() => navigate(`/explorar/cursos/${cId}`)} />
      )}
    </div>
  )
}

function VideoBody({ url, titulo }: { url: string; titulo: string }) {
  const t = useT()
  const embed = toEmbedUrl(url)
  return (
    <div className="aspect-video overflow-hidden rounded-xl border border-surface-border bg-black">
      {embed ? (
        <iframe
          src={embed}
          title={titulo}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-full items-center justify-center text-sm font-medium text-white/80 hover:text-white"
        >
          {t('exploreLesson.openVideoNewTab')}
        </a>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-white/50">{t('exploreLesson.videoInProduction')}</div>
      )}
    </div>
  )
}

function TextBody({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <div className="rounded-xl border border-surface-border bg-white p-6">
      <div className="flex max-w-prose flex-col gap-4 text-[15px] leading-relaxed text-ink-soft">
        {(paragraphs.length > 0 ? paragraphs : [text]).map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}
