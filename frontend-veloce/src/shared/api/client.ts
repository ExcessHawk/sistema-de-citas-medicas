/**
 * Typed fetch client for the veloce-ts backend.
 *
 * - Base URL: `VITE_API_URL` if set, else relative (dev uses the Vite proxy).
 * - Attaches `Authorization: Bearer <token>` from localStorage.
 * - On 401 clears auth and redirects to /login (once).
 * - Extracts the backend's problem+json error message (`error`/`detail`).
 */
import { getToken, clearAuth } from '@/shared/auth/token'

const BASE = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

type Params = Record<string, string | number | boolean | undefined | null>

function buildUrl(path: string, params?: Params): string {
  const url = `${BASE}${path}`
  if (!params) return url
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.append(k, String(v))
  }
  const s = qs.toString()
  return s ? `${url}?${s}` : url
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; params?: Params } = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(buildUrl(path, options.params), {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (res.status === 401) {
    clearAuth()
    if (!location.pathname.startsWith('/login')) location.href = '/login'
    throw new ApiError(401, 'No autorizado')
  }

  // 204 / empty body
  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message =
      (data && (data.error || data.detail || data.message)) || `Error ${res.status}`
    throw new ApiError(res.status, message)
  }

  return data as T
}

/**
 * Sube un archivo como multipart.
 *
 * No se fija `Content-Type`: lo pone el navegador con el `boundary`, y sin él
 * el servidor no puede separar las partes.
 */
async function upload<T>(path: string, file: File): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const form = new FormData()
  form.append('file', file)

  const res = await fetch(buildUrl(path), { method: 'POST', headers, body: form })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const message =
      (data && (data.error || data.detail || data.message)) || `Error ${res.status}`
    throw new ApiError(res.status, message)
  }
  return data as T
}

/**
 * Descarga un archivo protegido.
 *
 * Un `<a href>` no lleva la cabecera de autorización, y estos adjuntos no son
 * públicos: se piden con el token y se abren desde memoria.
 */
async function download(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(buildUrl(path), { headers })
  if (!res.ok) {
    let message = `Error ${res.status}`
    try {
      const data = JSON.parse(await res.text())
      message = data.error || data.detail || data.message || message
    } catch {
      /* el cuerpo no era JSON */
    }
    throw new ApiError(res.status, message)
  }

  const dispo = res.headers.get('content-disposition') ?? ''
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(dispo)
  return { blob: await res.blob(), filename: match ? decodeURIComponent(match[1]) : null }
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>('GET', path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  del: <T>(path: string) => request<T>('DELETE', path),
  upload,
  download,
}
