/**
 * Tema de la aplicación.
 *
 * Verde azulado por decisión, no por gusto: es el color que la señalética
 * hospitalaria usa para lo clínico, y deja el rojo libre para lo único que
 * debe alarmar — cancelar, borrar, un valor fuera de rango.
 */
import { createTheme, type MantineColorsTuple } from '@mantine/core'

const clinico: MantineColorsTuple = [
  '#e6fcf8',
  '#d0f5ee',
  '#a3ebdc',
  '#72e0c9',
  '#4bd7b9',
  '#32d2af',
  '#1fcfaa',
  '#0bb794',
  '#00a383',
  '#008d70',
]

export const theme = createTheme({
  primaryColor: 'clinico',
  colors: { clinico },
  defaultRadius: 'md',
  fontFamily:
    "'Geist Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  headings: {
    fontWeight: '650',
    sizes: {
      h1: { fontSize: '1.75rem', lineHeight: '1.2' },
      h2: { fontSize: '1.35rem', lineHeight: '1.3' },
      h3: { fontSize: '1.1rem', lineHeight: '1.4' },
    },
  },
  components: {
    Card: {
      defaultProps: { withBorder: true, padding: 'lg', radius: 'md' },
    },
    Paper: {
      defaultProps: { withBorder: true, radius: 'md' },
    },
    Button: {
      defaultProps: { radius: 'md' },
    },
    Table: {
      defaultProps: { highlightOnHover: true, verticalSpacing: 'sm' },
    },
  },
})

/**
 * Estados de una cita, con su color y su etiqueta en español.
 *
 * Vivían repartidos por la interfaz, y por eso un filtro llegó a mostrar "all"
 * en pantalla. Ahora hay un solo lugar donde se traducen.
 */
export const ESTADOS = {
  scheduled: { label: 'Programada', color: 'blue' },
  confirmed: { label: 'Confirmada', color: 'clinico' },
  completed: { label: 'Completada', color: 'green' },
  cancelled: { label: 'Cancelada', color: 'red' },
  no_show: { label: 'No asistió', color: 'orange' },
} as const

export type EstadoCita = keyof typeof ESTADOS

export function estadoDe(valor: string | null | undefined) {
  return ESTADOS[valor as EstadoCita] ?? { label: valor ?? '—', color: 'gray' }
}

/** Una cita cerrada ya no se cancela ni se edita. */
export function esFinal(estado: string | null | undefined): boolean {
  return estado === 'completed' || estado === 'cancelled' || estado === 'no_show'
}

/**
 * El nombre ya trae el título cuando lo trae. Anteponerlo a ciegas producía
 * "Dr. Dr. Carlos Rodríguez" en pantalla.
 */
/**
 * Primera letra en mayúscula y nada más.
 *
 * `text-transform: capitalize` pondría mayúscula en cada palabra y el español
 * no escribe así: "16 De Octubre" no existe.
 */
export function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function nombreDoctor(nombre: string | null | undefined): string {
  const limpio = (nombre ?? '').trim()
  if (!limpio) return 'Sin nombre'
  return /^(dr|dra)\.?\s/i.test(limpio) ? limpio : `Dr. ${limpio}`
}
