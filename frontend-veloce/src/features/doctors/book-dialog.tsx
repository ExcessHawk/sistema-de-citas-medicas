/**
 * Reservar una cita.
 *
 * El horario se escoge sobre una cuadrícula, no en una lista desplegable: así
 * se ve de un golpe qué queda libre y qué está tomado, que es la pregunta
 * real de quien agenda.
 */
import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  UnstyledButton,
} from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import { CalendarClock, Info, MapPin } from 'lucide-react'
import dayjs from 'dayjs'
import { useDoctorAvailability } from './hooks'
import { useCreateAppointment } from '@/features/appointments/hooks'
import { avisoError, avisoExito } from '@/shared/ui/avisos'
import { nombreDoctor } from '@/shared/ui/theme'
import type { Doctor } from '@/shared/api/types'

const FORMATO = 'YYYY-MM-DD'

export function BookAppointmentDialog({
  doctor,
  onClose,
}: {
  doctor: Doctor | null
  onClose: () => void
}) {
  const [fecha, setFecha] = useState<Date | null>(null)
  const [hora, setHora] = useState<string | null>(null)
  const [notas, setNotas] = useState('')

  const crear = useCreateAppointment()
  const fechaTexto = fecha ? dayjs(fecha).format(FORMATO) : undefined
  const { data: disponibilidad, isFetching } = useDoctorAvailability(
    doctor?.id ?? null,
    fechaTexto,
  )

  // Al cambiar de doctor o de día, la hora elegida deja de tener sentido.
  useEffect(() => {
    setHora(null)
  }, [doctor?.id, fechaTexto])

  useEffect(() => {
    if (!doctor) {
      setFecha(null)
      setNotas('')
    }
  }, [doctor])

  const libres = disponibilidad?.availableSlots ?? disponibilidad?.availableHours ?? []
  const tomadas = disponibilidad?.bookedTimes ?? []
  const todas = [...new Set([...libres, ...tomadas])].sort()

  const reservar = async () => {
    if (!doctor || !fechaTexto || !hora) return
    try {
      await crear.mutateAsync({
        doctorId: doctor.id,
        appointmentDate: fechaTexto,
        appointmentTime: hora,
        ...(notas.trim() ? { notes: notas.trim() } : {}),
      })
      avisoExito('Cita reservada', `${dayjs(fecha).format('D [de] MMMM')} a las ${hora}`)
      onClose()
    } catch (e) {
      avisoError(e, 'No se pudo reservar')
    }
  }

  return (
    <Modal
      opened={doctor !== null}
      onClose={onClose}
      title={doctor ? `Reservar con ${nombreDoctor(doctor.name)}` : ''}
      size="lg"
      centered
    >
      {doctor && (
        <Stack gap="md">
          <Group gap="xs" wrap="wrap">
            {doctor.specialty && (
              <Badge variant="light" color="clinico">
                {doctor.specialty}
              </Badge>
            )}
            {doctor.consultationFee && (
              <Badge variant="default">
                ${Number(doctor.consultationFee).toLocaleString('es-MX')} MXN
              </Badge>
            )}
          </Group>

          {doctor.address && (
            <Group gap={6} c="dimmed" wrap="nowrap">
              <MapPin size={14} />
              <Text size="sm" lineClamp={2}>
                {doctor.address}
              </Text>
            </Group>
          )}

          <Divider />

          <div>
            <Text fw={600} size="sm" mb="xs">
              1. Escoge el día
            </Text>
            <Group justify="center">
              <DatePicker
                value={fecha}
                onChange={(v) => setFecha(v ? new Date(v) : null)}
                minDate={new Date()}
                maxDate={dayjs().add(3, 'month').toDate()}
                // Sin domingos: ningún consultorio de la demostración abre.
                excludeDate={(d) => dayjs(d).day() === 0}
              />
            </Group>
          </div>

          {fecha && (
            <div>
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm">
                  2. Escoge la hora
                </Text>
                {isFetching && <Loader size="xs" color="clinico" />}
              </Group>

              {todas.length === 0 && !isFetching ? (
                <Alert color="gray" icon={<Info size={16} />}>
                  Este doctor no publicó horarios para ese día. Prueba con otra fecha.
                </Alert>
              ) : (
                <>
                  <SimpleGrid cols={{ base: 3, sm: 4, md: 5 }} spacing="xs">
                    {todas.map((slot) => {
                      const ocupada = tomadas.includes(slot)
                      const elegida = hora === slot
                      return (
                        <UnstyledButton
                          key={slot}
                          disabled={ocupada}
                          onClick={() => setHora(slot)}
                          aria-pressed={elegida}
                          aria-label={ocupada ? `${slot}, ocupado` : `${slot}, libre`}
                          style={{
                            padding: '8px 4px',
                            borderRadius: 'var(--mantine-radius-md)',
                            textAlign: 'center',
                            fontSize: 14,
                            fontWeight: elegida ? 600 : 400,
                            cursor: ocupada ? 'not-allowed' : 'pointer',
                            border: `1px solid ${
                              elegida
                                ? 'var(--mantine-color-clinico-6)'
                                : 'var(--mantine-color-default-border)'
                            }`,
                            backgroundColor: elegida
                              ? 'var(--mantine-color-clinico-light)'
                              : ocupada
                                ? 'var(--mantine-color-default-hover)'
                                : 'transparent',
                            color: ocupada
                              ? 'var(--mantine-color-dimmed)'
                              : elegida
                                ? 'var(--mantine-color-clinico-light-color)'
                                : undefined,
                            textDecoration: ocupada ? 'line-through' : undefined,
                            opacity: ocupada ? 0.6 : 1,
                          }}
                        >
                          {slot}
                        </UnstyledButton>
                      )
                    })}
                  </SimpleGrid>

                  {tomadas.length > 0 && (
                    <Text size="xs" c="dimmed" mt="xs">
                      Los horarios tachados ya están ocupados.
                    </Text>
                  )}
                </>
              )}
            </div>
          )}

          {hora && (
            <Textarea
              label="Motivo de la consulta"
              description="Opcional, pero le ahorra preguntas al doctor"
              placeholder="Qué te trae, desde cuándo, si ya tomaste algo…"
              autosize
              minRows={2}
              maxRows={5}
              value={notas}
              onChange={(e) => setNotas(e.currentTarget.value)}
            />
          )}

          <Group justify="space-between" mt="sm">
            <Text size="sm" c="dimmed">
              {hora
                ? `${dayjs(fecha).format('dddd D [de] MMMM')} a las ${hora}`
                : 'Falta escoger día y hora'}
            </Text>
            <Group gap="sm">
              <Button variant="default" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                leftSection={<CalendarClock size={16} />}
                disabled={!hora}
                loading={crear.isPending}
                onClick={reservar}
              >
                Reservar
              </Button>
            </Group>
          </Group>
        </Stack>
      )}
    </Modal>
  )
}
