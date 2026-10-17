import { useEffect, useState } from 'react'
import { Button, Group, Modal, Select, Stack, Text, Textarea } from '@mantine/core'
import dayjs from 'dayjs'
import { useUpdateAppointment } from './hooks'
import { avisoError, avisoExito } from '@/shared/ui/avisos'
import { ESTADOS, nombreDoctor } from '@/shared/ui/theme'
import { useAuth } from '@/shared/auth/auth-context'
import type { Appointment, AppointmentStatus } from '@/shared/api/types'

/**
 * Un paciente puede confirmar o cancelar la suya. Marcarla como completada o
 * como ausencia es un juicio clínico, y lo hace quien atendió.
 */
const PARA_PACIENTE: AppointmentStatus[] = ['scheduled', 'confirmed', 'cancelled']

export function EditAppointmentDialog({
  appointment,
  onClose,
}: {
  appointment: Appointment | null
  onClose: () => void
}) {
  const { user } = useAuth()
  const esClinico = user?.role === 'doctor' || user?.role === 'admin'
  const actualizar = useUpdateAppointment()

  const [estado, setEstado] = useState<AppointmentStatus>('scheduled')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    if (appointment) {
      setEstado(appointment.status)
      setNotas(appointment.notes ?? '')
    }
  }, [appointment])

  const opciones = Object.entries(ESTADOS)
    .filter(([valor]) => esClinico || PARA_PACIENTE.includes(valor as AppointmentStatus))
    .map(([value, { label }]) => ({ value, label }))

  const guardar = async () => {
    if (!appointment) return
    try {
      await actualizar.mutateAsync({
        id: appointment.id,
        body: { status: estado, notes: notas },
      })
      avisoExito('Cita actualizada')
      onClose()
    } catch (e) {
      avisoError(e, 'No se pudo actualizar')
    }
  }

  const cuando = appointment
    ? dayjs(`${appointment.appointmentDate}T${appointment.appointmentTime}`)
    : null

  return (
    <Modal opened={appointment !== null} onClose={onClose} title="Editar cita" centered>
      {appointment && (
        <Stack gap="md">
          <div>
            <Text fw={600}>
              {esClinico ? appointment.patientName : nombreDoctor(appointment.doctorName)}
            </Text>
            <Text size="sm" c="dimmed">
              {cuando?.format('dddd D [de] MMMM [de] YYYY, HH:mm')}
            </Text>
          </div>

          <Select
            label="Estado"
            data={opciones}
            value={estado}
            onChange={(v) => v && setEstado(v as AppointmentStatus)}
            allowDeselect={false}
          />

          <Textarea
            label="Notas"
            description={
              esClinico
                ? 'Lo que quieras dejar escrito de esta consulta'
                : 'Lo que el doctor debería saber antes de verte'
            }
            autosize
            minRows={3}
            maxRows={8}
            value={notas}
            onChange={(e) => setNotas(e.currentTarget.value)}
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={guardar} loading={actualizar.isPending}>
              Guardar
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  )
}
