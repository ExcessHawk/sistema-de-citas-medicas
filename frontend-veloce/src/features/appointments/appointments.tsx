import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarX, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/shared/auth/auth-context'
import { useAppointments, useCancelAppointment } from './hooks'
import { EditAppointmentDialog } from './edit-dialog'
import { ApiError } from '@/shared/api/client'
import type { Appointment, AppointmentStatus } from '@/shared/api/types'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loading, EmptyState, ErrorState } from '@/components/common/states'
import { AppointmentStatusBadge } from '@/components/common/status-badge'
import { formatDate, formatTime } from '@/shared/lib/format'

export function AppointmentsPage() {
  const { isDoctor } = useAuth()
  const { data: appointments, isLoading, isError } = useAppointments()
  const cancel = useCancelAppointment()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [editing, setEditing] = useState<Appointment | null>(null)

  const filtered = useMemo(() => {
    let list = appointments ?? []
    const q = search.toLowerCase().trim()
    if (q) {
      list = list.filter(
        (a) =>
          (a.doctorName ?? '').toLowerCase().includes(q) ||
          (a.patientName ?? '').toLowerCase().includes(q),
      )
    }
    if (status !== 'all') list = list.filter((a) => a.status === status)
    return list
  }, [appointments, search, status])

  const onCancel = async (id: number) => {
    if (!confirm('¿Cancelar esta cita?')) return
    try {
      await cancel.mutateAsync(id)
      toast.success('Cita cancelada')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al cancelar')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis citas</h1>
        <Link to="/doctors" className={cn(buttonVariants())}>
          Nueva cita
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          className="sm:max-w-xs"
          placeholder={`Buscar por ${isDoctor ? 'paciente' : 'doctor'}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onValueChange={(v) => setStatus(v ?? 'all')}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="scheduled">Programadas</SelectItem>
            <SelectItem value="confirmed">Confirmadas</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Loading rows={5} />
      ) : isError ? (
        <ErrorState />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="Sin citas"
          description="No hay citas que coincidan con el filtro."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isDoctor ? 'Paciente' : 'Doctor'}</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {isDoctor ? a.patientName : `Dr. ${a.doctorName ?? ''}`}
                    {a.specialty && (
                      <span className="block text-xs text-muted-foreground">{a.specialty}</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(a.appointmentDate)}</TableCell>
                  <TableCell>{formatTime(a.appointmentTime)}</TableCell>
                  <TableCell>
                    <AppointmentStatusBadge status={a.status as AppointmentStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>
                        <Pencil className="size-4" />
                      </Button>
                      {a.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => onCancel(a.id)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EditAppointmentDialog
        appointment={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </div>
  )
}
