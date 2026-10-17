import { Badge, type MantineSize } from '@mantine/core'
import { estadoDe } from '@/shared/ui/theme'
import { followUpStatusLabel } from '@/shared/lib/format'
import type { AppointmentStatus, FollowUpStatus } from '@/shared/api/types'

/** Una cita se pinta igual en todas las pantallas. */
export function AppointmentStatusBadge({
  status,
  size = 'sm',
}: {
  status: AppointmentStatus
  size?: MantineSize
}) {
  const info = estadoDe(status)
  return (
    <Badge variant="light" color={info.color} size={size}>
      {info.label}
    </Badge>
  )
}

const COLOR_SEGUIMIENTO: Record<string, string> = {
  scheduled: 'blue',
  completed: 'green',
  cancelled: 'red',
  no_show: 'orange',
}

export function FollowUpStatusBadge({
  status,
  size = 'sm',
}: {
  status: FollowUpStatus
  size?: MantineSize
}) {
  return (
    <Badge variant="light" color={COLOR_SEGUIMIENTO[status] ?? 'gray'} size={size}>
      {followUpStatusLabel[status] ?? status}
    </Badge>
  )
}
