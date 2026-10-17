/**
 * Agenda del doctor.
 *
 * Esto es lo que faltaba: una aplicación de citas sin calendario obliga a
 * leer una tabla para responder "¿qué tengo mañana?". Aquí el mes marca los
 * días con consulta y el panel de al lado cuenta la hora a hora.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Badge,
  Card,
  Grid,
  Group,
  Indicator,
  Paper,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { Calendar } from '@mantine/dates'
import { CalendarDays, Clock, FileText, UserRound } from 'lucide-react'
import dayjs from 'dayjs'
import { useAppointments } from '@/features/appointments/hooks'
import { EmptyState, ErrorState, Loading } from '@/components/common/states'
import { estadoDe, mayuscula } from '@/shared/ui/theme'
import type { Appointment } from '@/shared/api/types'

const FORMATO = 'YYYY-MM-DD'

export function AgendaPage() {
  const { data, isLoading, isError, refetch } = useAppointments()
  // Mantine 8 habla de fechas en texto 'YYYY-MM-DD', no en Date.
  const [dia, setDia] = useState<string>(dayjs().format(FORMATO))
  const [ambito, setAmbito] = useState<'dia' | 'semana'>('dia')

  // Un índice por fecha: el calendario pregunta por cada día que dibuja, y
  // recorrer la lista completa en cada celda sería trabajo de más.
  const porFecha = useMemo(() => {
    const mapa = new Map<string, Appointment[]>()
    for (const cita of data ?? []) {
      if (cita.status === 'cancelled') continue
      const clave = dayjs(cita.appointmentDate).format(FORMATO)
      mapa.set(clave, [...(mapa.get(clave) ?? []), cita])
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
    }
    return mapa
  }, [data])

  const visibles = useMemo(() => {
    const base = dayjs(dia)
    if (ambito === 'dia') return porFecha.get(base.format(FORMATO)) ?? []

    const inicio = base.startOf('week')
    const salida: Appointment[] = []
    for (let i = 0; i < 7; i += 1) {
      salida.push(...(porFecha.get(inicio.add(i, 'day').format(FORMATO)) ?? []))
    }
    return salida.sort((a, b) =>
      dayjs(`${a.appointmentDate}T${a.appointmentTime}`).diff(
        dayjs(`${b.appointmentDate}T${b.appointmentTime}`),
      ),
    )
  }, [porFecha, dia, ambito])

  const titulo =
    ambito === 'dia'
      ? dayjs(dia).format('dddd, D [de] MMMM')
      : `Semana del ${dayjs(dia).startOf('week').format('D [de] MMM')}`

  if (isLoading) return <Loading rows={3} height={110} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>Mi agenda</Title>
        <Text c="dimmed" size="sm">
          Los días con punto tienen consulta
        </Text>
      </div>

      <Grid gutter="md" align="flex-start">
        <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
          <Card>
            <Calendar
              date={dia}
              onDateChange={setDia}
              getDayProps={(fecha) => ({
                selected: dayjs(fecha).isSame(dia, 'date'),
                onClick: () => setDia(fecha),
              })}
              renderDay={(fecha) => {
                const cuantas = porFecha.get(dayjs(fecha).format(FORMATO))?.length ?? 0
                return (
                  <Indicator
                    size={6}
                    color="clinico"
                    offset={-4}
                    disabled={cuantas === 0}
                    label={cuantas > 1 ? cuantas : undefined}
                    styles={{ indicator: { fontSize: 9, padding: cuantas > 1 ? '0 4px' : 0 } }}
                  >
                    <div>{dayjs(fecha).date()}</div>
                  </Indicator>
                )
              }}
            />
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
          <Card>
            <Group justify="space-between" align="center" mb="md" wrap="wrap">
              <Group gap="xs">
                <ThemeIcon variant="light" color="clinico" size={32} radius="md">
                  <CalendarDays size={17} />
                </ThemeIcon>
                <div>
                  <Text fw={600}>{mayuscula(titulo)}</Text>
                  <Text size="xs" c="dimmed">
                    {visibles.length} {visibles.length === 1 ? 'consulta' : 'consultas'}
                  </Text>
                </div>
              </Group>

              <SegmentedControl
                size="xs"
                value={ambito}
                onChange={(v) => setAmbito(v as 'dia' | 'semana')}
                data={[
                  { value: 'dia', label: 'Día' },
                  { value: 'semana', label: 'Semana' },
                ]}
              />
            </Group>

            {visibles.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title={ambito === 'dia' ? 'Nada agendado este día' : 'Semana libre'}
                description="Escoge otro día en el calendario para ver su consulta."
              />
            ) : (
              <ScrollArea.Autosize mah={520}>
                <Stack gap="xs">
                  {visibles.map((cita) => {
                    const info = estadoDe(cita.status)
                    const cuando = dayjs(`${cita.appointmentDate}T${cita.appointmentTime}`)
                    return (
                      <Paper key={cita.id} p="sm" radius="md">
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                            <Stack gap={0} align="center" miw={54}>
                              <Text fw={700} fz="lg" lh={1.1}>
                                {cuando.format('HH:mm')}
                              </Text>
                              {ambito === 'semana' && (
                                <Text size="xs" c="dimmed">
                                  {mayuscula(cuando.format('ddd D'))}
                                </Text>
                              )}
                            </Stack>

                            <div style={{ minWidth: 0 }}>
                              <Group gap={6} wrap="nowrap">
                                <UserRound size={14} />
                                <Text size="sm" fw={500} lineClamp={1}>
                                  {cita.patientName ?? 'Paciente'}
                                </Text>
                              </Group>
                              {cita.notes && (
                                <Text size="xs" c="dimmed" lineClamp={2} mt={2}>
                                  {cita.notes}
                                </Text>
                              )}
                            </div>
                          </Group>

                          <Stack gap={6} align="flex-end">
                            <Badge variant="light" color={info.color} size="sm">
                              {info.label}
                            </Badge>
                            {cita.patientId && (
                              <Text
                                component={Link}
                                to={`/patient/${cita.patientId}/history`}
                                size="xs"
                                c="clinico"
                                fw={500}
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                <FileText size={12} />
                                Historial
                              </Text>
                            )}
                          </Stack>
                        </Group>
                      </Paper>
                    )
                  })}
                </Stack>
              </ScrollArea.Autosize>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      <Group gap="lg" c="dimmed">
        <Group gap={6}>
          <Clock size={14} />
          <Text size="xs">Las canceladas no se dibujan en el calendario</Text>
        </Group>
      </Group>
    </Stack>
  )
}
