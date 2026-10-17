/**
 * Avisos al usuario.
 *
 * Una capa fina sobre las notificaciones de Mantine para que las pantallas no
 * repitan colores ni iconos, y para que un error de la API se traduzca en un
 * solo lugar.
 */
import { notifications } from '@mantine/notifications'
import { ApiError } from '@/shared/api/client'

export function avisoExito(mensaje: string, detalle?: string) {
  notifications.show({
    message: mensaje,
    ...(detalle ? { title: mensaje, message: detalle } : {}),
    color: 'clinico',
    autoClose: 3500,
  })
}

export function avisoError(causa: unknown, respaldo = 'Algo salió mal') {
  const mensaje =
    causa instanceof ApiError
      ? causa.message
      : causa instanceof Error
        ? causa.message
        : respaldo

  notifications.show({
    title: 'No se pudo completar',
    message: mensaje,
    color: 'red',
    autoClose: 6000,
  })
}
