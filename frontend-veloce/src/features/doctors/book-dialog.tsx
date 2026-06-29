import { useState } from 'react'
import { toast } from 'sonner'
import { useDoctorAvailability } from './hooks'
import { useCreateAppointment } from '@/features/appointments/hooks'
import { ApiError } from '@/shared/api/client'
import type { Doctor } from '@/shared/api/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function BookAppointmentDialog({
  doctor,
  open,
  onOpenChange,
}: {
  doctor: Doctor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const { data: availability } = useDoctorAvailability(doctor?.id ?? null, date || undefined)
  const create = useCreateAppointment()

  const slots = date ? availability?.availableSlots ?? [] : doctor?.availableHours ?? []
  const today = new Date().toISOString().slice(0, 10)

  const reset = () => {
    setDate('')
    setTime('')
    setNotes('')
  }

  const submit = async () => {
    if (!doctor || !date || !time) {
      toast.error('Selecciona fecha y hora')
      return
    }
    try {
      await create.mutateAsync({
        doctorId: doctor.id,
        appointmentDate: date,
        appointmentTime: time,
        notes: notes || undefined,
      })
      toast.success('Cita programada')
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al reservar')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reservar con Dr. {doctor?.name}</DialogTitle>
          <DialogDescription>{doctor?.specialty}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setTime('')
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Hora</Label>
            <Select
              value={time}
              onValueChange={(v) => setTime(v ?? '')}
              disabled={!date || slots.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={date ? 'Selecciona horario' : 'Elige una fecha primero'} />
              </SelectTrigger>
              <SelectContent>
                {slots.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {date && slots.length === 0 && (
              <p className="text-xs text-muted-foreground">No hay horarios disponibles ese día.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo de la consulta…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Reservando…' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
