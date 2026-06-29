import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarClock, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '@/shared/auth/auth-context'
import { useAppointments, useAppointmentStats } from '@/features/appointments/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Loading, EmptyState } from '@/components/common/states'
import { cn } from '@/lib/utils'
import { AppointmentStatusBadge } from '@/components/common/status-badge'
import { formatDate, formatTime } from '@/shared/lib/format'
import type { Appointment } from '@/shared/api/types'

export function DashboardPage() {
  const { user, isDoctor } = useAuth()
  const { data: appointments, isLoading } = useAppointments()
  const { data: stats } = useAppointmentStats()

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = (appointments ?? [])
    .filter((a) => a.appointmentDate >= today && a.status !== 'cancelled')
    .slice(0, 5)

  const cards = [
    { label: 'Total', value: stats?.totalAppointments ?? 0, icon: CalendarCheck },
    { label: 'Programadas', value: stats?.scheduled ?? 0, icon: CalendarClock },
    { label: 'Completadas', value: stats?.completed ?? 0, icon: CheckCircle2 },
    { label: 'Canceladas', value: stats?.cancelled ?? 0, icon: XCircle },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hola, {user?.name}</h1>
          <p className="text-sm text-muted-foreground">Resumen de tu actividad</p>
        </div>
        <Link to="/doctors" className={cn(buttonVariants())}>
          Reservar cita
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <c.icon className="size-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximas citas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loading />
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Sin citas próximas"
              description="Reserva una cita con un especialista."
              action={
                <Link to="/doctors" className={cn(buttonVariants({ size: 'sm' }))}>
                  Ver doctores
                </Link>
              }
            />
          ) : (
            <ul className="divide-y">
              {upcoming.map((a) => (
                <Row key={a.id} appointment={a} showDoctor={!isDoctor} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ appointment: a, showDoctor }: { appointment: Appointment; showDoctor: boolean }) {
  return (
    <li className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium">
          {showDoctor ? `Dr. ${a.doctorName ?? ''}` : a.patientName}
          {a.specialty ? ` · ${a.specialty}` : ''}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatDate(a.appointmentDate)} · {formatTime(a.appointmentTime)}
        </p>
      </div>
      <AppointmentStatusBadge status={a.status} />
    </li>
  )
}
