// Cliente del Tutor IA de Zyfit Academy (RAG sobre el contenido de los cursos).
// El cliente axios (client.ts) ya añade el JWT y refresca ante 401.

import { api } from './client'

export interface TutorSource {
  chunk_id: number
  course_id: number
  curso_slug: string
  curso: string
  escuela: string
  modulo: string
  leccion: string
  lesson_id: number
}

export type TutorRole = 'user' | 'assistant'
export type TutorFeedback = '' | 'util' | 'no_util'

export interface TutorMessage {
  id: number
  role: TutorRole
  contenido: string
  fuentes: TutorSource[]
  redirigido: boolean
  feedback: TutorFeedback
  created_at: string
}

export interface TutorCuota {
  usados: number
  limite: number
  restantes: number
}

export interface TutorChatResponse {
  conversation_id: number
  mensaje: TutorMessage
  cuota: TutorCuota
}

export interface TutorChatPayload {
  mensaje: string
  conversation_id?: number | null
  course_id?: number | null
  curso_activo?: string
}

export async function sendTutorMessage(payload: TutorChatPayload): Promise<TutorChatResponse> {
  const res = await api.post<TutorChatResponse>('/academy/tutor/chat/', payload)
  return res.data
}

export interface TutorConversationSummary {
  id: number
  titulo: string
  course_id: number | null
  n_mensajes: number
  created_at: string
  updated_at: string
}

export async function listTutorConversations(): Promise<TutorConversationSummary[]> {
  const res = await api.get<{ conversations: TutorConversationSummary[] }>('/academy/tutor/conversations/')
  return res.data.conversations
}

export interface TutorConversationDetail extends TutorConversationSummary {
  mensajes: TutorMessage[]
}

export async function getTutorConversation(id: number): Promise<TutorConversationDetail> {
  const res = await api.get<TutorConversationDetail>(`/academy/tutor/conversations/${id}/`)
  return res.data
}

export async function sendTutorFeedback(messageId: number, feedback: 'util' | 'no_util'): Promise<void> {
  await api.post(`/academy/tutor/messages/${messageId}/feedback/`, { feedback })
}
