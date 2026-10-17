/**
 * Inicio del paciente.
 *
 * Lo primero que necesita saber alguien que llega: cuándo es su próxima cita.
 * Por eso esa tarjeta ocupa el ancho, y los conteos van arriba en una fila
 * delgada en vez de cuatro cajas del tamaño de un puño.
 */
import { Link } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { CalendarCheck, CalendarPlus, CalendarX, CheckCircle2, Clock, Stethoscope } from 'lucide-react'
import dayjs from 'dayjs'
import { useAppointments, useAppointmentStats } from '@/features/appointments/hooks'
import { EmptyState, ErrorState, Loading } from '@/components/common/states'
import { useAuth } from '@/shared/auth/auth-context'
import { estadoDe, mayuscula, nombreDoctor } from '@/shared/ui/theme'
import type { Appointment } from '@/shared/api/types'

function Conteo({
  icono: Icono,
  valor,
  etiqueta,
  color,
}: {
  icono: typeof CalendarCheck
  valor: number | string
  etiqueta: string
  color: string
}) {
  return (
    <Paper p="sm" radius="md">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon variant="light" color={color} size={34} radius="md">
          <Icono size={18} />
        </ThemeIcon>
        <div style={{ minWidth: 0 }}>
          <Text fw={700} fz="lg" lh={1.1}>
            {valor}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {etiqueta}
          </Text>
        </div>
      </Group>
    </Paper>
  )
}

function Proxima({ cita }: { cita: Appointment }) {
  const cuando = dayjs(`${cita.appointmentDate}T${cita.appointmentTime}`)
  const faltan = cuando.diff(dayjs(), 'day')
  const estado = estadoDe(cita.status)

  return (
    <Card>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4} style={{ minWidth: 0 }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Tu próxima cita
          </Text>
          <Title order={2}>{nombreDoctor(cita.doctorName)}</Title>
          {cita.specialty && (
            <Text size="sm" c="dimmed">
              {cita.specialty}
            </Text>
          )}
        </Stack>
        <Badge color={estado.color} variant="light" size="lg">
          {estado.label}
        </Badge>
      </Group>

      <Divider my="md" />

      <Group gap="xl">
        <Group gap={8}>
          <CalendarCheck size={17} />
          <Text size="sm">{cuando.format('D [de] MMMM [de] YYYY')}</Text>
        </Group>
        <Group gap={8}>
          <Clock size={17} />
          <Text size="sm">{cuando.format('HH:mm')}</Text>
        </Group>
        <Text size="sm" c="clinico" fw={600}>
          {faltan === 0 ? 'Es hoy' : faltan === 1 ? 'Es mañana' : `Faltan ${faltan} días`}
        </Text>
      </Group>

      <Group mt="md" gap="sm">
        <Button component={Link} to="/appointments" variant="light" size="sm">
          Ver todas mis citas
        </Button>
      </Group>
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data: citas, isLoading, isError, refetch } = useAppointments()
  const { data: conteos } = useAppointmentStats()

  const ahora = dayjs()
  const proximas = (citas ?? [])
    .filter(
      (c) =>
        !['cancelled', 'completed', 'no_show'].includes(c.status) &&
        dayjs(`${c.appointmentDate}T${c.appointmentTime}`).isAfter(ahora),
    )
    .sort((a, b) =>
      dayjs(`${a.appointmentDate}T${a.appointmentTime}`).diff(
        dayjs(`${b.appointmentDate}T${b.appointmentTime}`),
      ),
    )

  const pasadas = (citas ?? [])
    .filter((c) => dayjs(`${c.appointmentDate}T${c.appointmentTime}`).isBefore(ahora))
    .sort((a, b) =>
      dayjs(`${b.appointmentDate}T${b.appointmentTime}`).diff(
        dayjs(`${a.appointmentDate}T${a.appointmentTime}`),
      ),
    )
    .slice(0, 4)

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div>
          <Title order={1}>Hola, {user?.name?.split(' ')[0]}</Title>
          <Text c="dimmed" size="sm">
            {mayuscula(ahora.format('dddd, D [de] MMMM'))}
          </Text>
        </div>
        <Button component={Link} to="/doctors" leftSection={<CalendarPlus size={16} />}>
          Reservar cita
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        <Conteo icono={CalendarCheck} color="blue" valor={conteos?.totalAppointments ?? 0} etiqueta="Totales" />
        <Conteo icono={Clock} color="clinico" valor={conteos?.scheduled ?? 0} etiqueta="Programadas" />
        <Conteo icono={CheckCircle2} color="green" valor={conteos?.completed ?? 0} etiqueta="Completadas" />
        <Conteo icono={CalendarX} color="red" valor={conteos?.cancelled ?? 0} etiqueta="Canceladas" />
      </SimpleGrid>

      {isLoading ? (
        <Loading rows={2} height={120} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : proximas.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No tienes citas próximas"
          description="Busca un especialista, mira dónde queda su consultorio y reserva un horario."
          action={
            <Button component={Link} to="/doctors">
              Buscar doctor
            </Button>
          }
        />
      ) : (
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Proxima cita={proximas[0]!} />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card h="100%">
              <Text fw={600} mb="sm">
                Después de esa
              </Text>
              {proximas.length === 1 ? (
                <Text size="sm" c="dimmed">
                  No hay más citas agendadas.
                </Text>
              ) : (
                <Stack gap="xs">
                  {proximas.slice(1, 4).map((c) => {
                    const cuando = dayjs(`${c.appointmentDate}T${c.appointmentTime}`)
                    return (
                      <Group key={c.id} justify="space-between" wrap="nowrap">
                        <div style={{ minWidth: 0 }}>
                          <Text size="sm" lineClamp={1}>
                            {nombreDoctor(c.doctorName)}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {cuando.format('D MMM · HH:mm')}
                          </Text>
                        </div>
                        <Badge size="sm" variant="light" color={estadoDe(c.status).color}>
                          {estadoDe(c.status).label}
                        </Badge>
                      </Group>
                    )
                  })}
                </Stack>
              )}
            </Card>
          </Grid.Col>
        </Grid>
      )}

      {pasadas.length > 0 && (
        <Card>
          <Text fw={600} mb="sm">
            Consultas anteriores
          </Text>
          <Stack gap="xs">
            {pasadas.map((c) => {
              const cuando = dayjs(`${c.appointmentDate}T${c.appointmentTime}`)
              return (
                <Group key={c.id} justify="space-between" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" lineClamp={1}>
                      {nombreDoctor(c.doctorName)}
                      {c.specialty ? ` · ${c.specialty}` : ''}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {cuando.format('D [de] MMMM [de] YYYY · HH:mm')}
                    </Text>
                  </div>
                  <Badge size="sm" variant="light" color={estadoDe(c.status).color}>
                    {estadoDe(c.status).label}
                  </Badge>
                </Group>
              )
            })}
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
