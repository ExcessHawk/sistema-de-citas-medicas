import { Badge } from '@/components/ui/badge'
import { appointmentStatusLabel, followUpStatusLabel } from '@/shared/lib/format'
import type { AppointmentStatus, FollowUpStatus } from '@/shared/api/types'

const variants: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  confirmed: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  no_show: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant="secondary" className={variants[status]}>
      {appointmentStatusLabel[status]}
    </Badge>
  )
}

export function FollowUpStatusBadge({ status }: { status: FollowUpStatus }) {
  return (
    <Badge variant="secondary" className={variants[status]}>
      {followUpStatusLabel[status]}
    </Badge>
  )
}
