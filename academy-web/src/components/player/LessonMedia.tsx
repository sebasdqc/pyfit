// Medio de una lección de video o audio.
//
//   YouTube / Vimeo        → iframe (traen sus propios subtítulos)
//   archivo de video       → <video> nativo (mp4, webm...) con pista de subtítulos
//   archivo de audio       → <audio> nativo
//   otra URL               → enlace a pestaña nueva
//   sin URL                → tarjeta "en producción"
//
// El guion de la lección SIEMPRE queda accesible como transcripción: con medio
// va en un desplegable (WCAG: alternativa en texto para audio/video); sin medio
// se muestra abierto, porque es lo único que hay que leer.
//
// Subtítulos: la pista .vtt de otro dominio solo la acepta el navegador si ese
// host envía CORS (Access-Control-Allow-Origin) y el <video> lleva
// crossOrigin="anonymous" — que a su vez exige CORS en el propio archivo de
// video. Por eso `crossOrigin` solo se activa cuando hay subtítulos.

import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { MarkdownLite } from '@/components/ui/MarkdownLite'
import { toEmbedUrl } from '@/lib/videoEmbed'
import { useT } from '@/locale/useT'
import type { Lesson } from '@/types'

const VIDEO_FILE = /\.(mp4|webm|ogv|m4v|mov)(\?|#|$)/i

export function LessonMedia({ lesson }: { lesson: Lesson }) {
  const t = useT()
  const esAudio = lesson.tipo === 'audio'
  const url = lesson.video_url
  const embed = esAudio ? null : toEmbedUrl(url)
  const guion = lesson.contenido

  let medio: ReactNode
  if (!url) {
    medio = (
      <div className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-brand to-brand-deep p-6 text-center ${esAudio ? '' : 'aspect-video'}`}>
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
          <Icon name={esAudio ? 'audio' : 'play'} size={24} />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{t(esAudio ? 'lessonMedia.audioInProduction' : 'lessonMedia.videoInProduction')}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/60">
            {t(guion ? 'lessonMedia.inProductionWithScript' : 'lessonMedia.inProductionNoScript')}
          </p>
        </div>
      </div>
    )
  } else if (embed) {
    medio = (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-surface-border bg-black">
        <iframe
          src={embed}
          title={lesson.titulo}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  } else if (esAudio) {
    // El campo video_url también guarda la URL del audio.
    medio = (
      <audio controls preload="none" src={url} className="w-full">
        {t('lessonMedia.audioUnsupported')}
      </audio>
    )
  } else if (VIDEO_FILE.test(url)) {
    medio = (
      <video
        controls
        playsInline
        preload="metadata"
        crossOrigin={lesson.subtitulos_url ? 'anonymous' : undefined}
        className="aspect-video w-full rounded-xl border border-surface-border bg-black"
      >
        <source src={url} />
        {lesson.subtitulos_url && (
          <track kind="subtitles" src={lesson.subtitulos_url} srcLang="es" label="Español" default />
        )}
        {t('lessonMedia.videoUnsupported')}
      </video>
    )
  } else {
    medio = (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface p-4 text-sm text-accent hover:bg-surface-soft"
      >
        <Icon name="play" size={18} /> {t('lessonMedia.openInNewTab')}
      </a>
    )
  }

  const tarjetaGuion = guion ? (
    <div className="rounded-xl border border-surface-border bg-surface p-6">
      <MarkdownLite text={guion} />
    </div>
  ) : null

  return (
    <div className="flex flex-col gap-5">
      {medio}
      {tarjetaGuion && (url ? (
        <details className="group rounded-xl border border-surface-border bg-surface-soft/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-sm font-semibold text-ink">
            <span>
              {t('lessonMedia.transcript')}
              <span className="ml-2 text-xs font-normal text-ink-muted">{t('lessonMedia.transcriptHint')}</span>
            </span>
            <Icon name="chevronDown" size={16} className="shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-1 pb-1">{tarjetaGuion}</div>
        </details>
      ) : tarjetaGuion)}
    </div>
  )
}
