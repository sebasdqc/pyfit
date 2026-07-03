// Llamadas al backend de Comunidad (foro Q&A asíncrono entre alumnos). Capa de
// engagement OPCIONAL de Zyfit Academy — moderación automática vía IA en el
// servidor (ver academy/community_service.py); el cliente solo lista/publica.

import { api } from './client'
import type {
  CommunityPost, CommunityPostDetail, CommunityPostsResponse, CommunityReply,
  CommunityReport, CommunityReportMotivo, CommunityVoteResult,
} from '@/types'

export interface ListCommunityPostsParams {
  escuela: number
  curso?: number
  orden?: 'recientes' | 'top'
}

export async function listCommunityPosts(params: ListCommunityPostsParams): Promise<CommunityPostsResponse> {
  const res = await api.get<CommunityPostsResponse>('/academy/community/posts/', {
    params: { escuela: params.escuela, curso: params.curso, orden: params.orden ?? 'recientes' },
  })
  return res.data
}

export interface CreateCommunityPostPayload {
  escuela: number
  curso?: number
  modulo?: number
  titulo: string
  contenido: string
}

export async function createCommunityPost(payload: CreateCommunityPostPayload): Promise<CommunityPost> {
  const res = await api.post<CommunityPost>('/academy/community/posts/', payload)
  return res.data
}

export async function getCommunityPost(postId: number): Promise<CommunityPostDetail> {
  const res = await api.get<CommunityPostDetail>(`/academy/community/posts/${postId}/`)
  return res.data
}

export async function createCommunityReply(postId: number, contenido: string): Promise<CommunityReply> {
  const res = await api.post<CommunityReply>(`/academy/community/posts/${postId}/respuestas/`, { contenido })
  return res.data
}

export async function voteCommunityReply(replyId: number): Promise<CommunityVoteResult> {
  const res = await api.post<CommunityVoteResult>(`/academy/community/respuestas/${replyId}/votar/`)
  return res.data
}

export async function markBestAnswer(postId: number, replyId: number): Promise<CommunityPostDetail> {
  const res = await api.post<CommunityPostDetail>(
    `/academy/community/posts/${postId}/mejor-respuesta/`,
    { reply_id: replyId },
  )
  return res.data
}

export interface ReportCommunityContentPayload {
  postId?: number
  replyId?: number
  motivo: CommunityReportMotivo
  detalle?: string
}

export async function reportCommunityContent(payload: ReportCommunityContentPayload): Promise<CommunityReport> {
  const res = await api.post<CommunityReport>('/academy/community/reportes/', {
    post_id: payload.postId,
    reply_id: payload.replyId,
    motivo: payload.motivo,
    detalle: payload.detalle,
  })
  return res.data
}
