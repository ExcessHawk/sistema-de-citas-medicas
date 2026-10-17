/**
 * Listado de citas.
 *
 * La misma pantalla sirve a los tres roles, pero no muestra lo mismo: el
 * paciente ve con quién va, el doctor ve a quién atiende. Y una cita cerrada
 * no ofrece acciones: cancelar algo ya completado no significa nada.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import {
  CalendarPlus,
  CalendarX,
  Ellipsis,
  FileText,
  Pencil,
  Search,
  Stethoscope,
} from 'lucide-react'
import dayjs from 'dayjs'
import { useAppointments, useCancelAppointment } from './hooks'
import { EditAppointmentDialog } from './edit-dialog'
import { EmptyState, ErrorState, Loading } from '@/components/common/states'
import { useAuth } from '@/shared/auth/auth-context'
import { avisoError, avisoExito } from '@/shared/ui/avisos'
import { ESTADOS, esFinal, estadoDe, nombreDoctor } from '@/shared/ui/theme'
import type { Appointment } from '@/shared/api/types'

const OPCIONES_ESTADO = [
  { value: 'todas', label: 'Todos los estados' },
  ...Object.entries(ESTADOS).map(([value, { label }]) => ({ value, label })),
]

export function AppointmentsPage() {
  const { user } = useAuth()
  const esDoctor = user?.role === 'doctor' || user?.role === 'admin'
  // En un teléfono la tabla obliga a arrastrar de lado para llegar a las
  // acciones, así que ahí las citas se leen como tarjetas.
  const enMovil = useMediaQuery('(max-width: 48em)')

  const { data, isLoading, isError, refetch } = useAppointments()
  const cancelar = useCancelAppointment()

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<string>('todas')
  const [editando, setEditando] = useState<Appointment | null>(null)
  const [cancelando, setCancelando] = useState<Appointment | null>(null)
  const [motivo, setMotivo] = useState('')

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return (data ?? [])
      .filter((c) => (estado === 'todas' ? true : c.status === estado))
      .filter((c) => {
        if (!q) return true
        const contra = esDoctor ? c.patientName : c.doctorName
        return (
          (contra ?? '').toLowerCase().includes(q) ||
          (c.specialty ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) =>
        dayjs(`${b.appointmentDate}T${b.appointmentTime}`).diff(
          dayjs(`${a.appointmentDate}T${a.appointmentTime}`),
        ),
      )
  }, [data, busqueda, estado, esDoctor])

  const cerrarCancelacion = () => {
    setCancelando(null)
    setMotivo('')
  }

  // Cancelar sin decir por qué deja a la otra persona adivinando, así que el
  // motivo es obligatorio y viaja guardado con la cita.
  const confirmarCancelacion = async () => {
    if (!cancelando) return
    const texto = motivo.trim()
    if (texto.length < 3) {
      avisoError(new Error('Escribe el motivo de la cancelación'))
      return
    }
    try {
      await cancelar.mutateAsync({ id: cancelando.id, motivo: texto })
      avisoExito('Cita cancelada')
      cerrarCancelacion()
    } catch (e) {
      avisoError(e, 'No se pudo cancelar la cita')
    }
  }

  const notasDe = (cita: Appointment) =>
    cita.status === 'cancelled' && cita.cancellationReason ? (
      <Text size="xs" c="dimmed" lineClamp={2}>
        <Text span fw={600} c="red.7" size="xs">
          Cancelada:{' '}
        </Text>
        {cita.cancellationReason}
      </Text>
    ) : (
      <Text size="xs" c="dimmed" lineClamp={2}>
        {cita.notes || '—'}
      </Text>
    )

  const accionesDe = (cita: Appointment, cerrada: boolean) =>
    cerrada ? (
      <Tooltip label="Una cita cerrada ya no se modifica">
        <Text size="xs" c="dimmed">
          sin acciones
        </Text>
      </Tooltip>
    ) : (
      <>
        <Tooltip label="Editar">
          <ActionIcon variant="subtle" color="gray" onClick={() => setEditando(cita)}>
            <Pencil size={16} />
          </ActionIcon>
        </Tooltip>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label="Más acciones">
              <Ellipsis size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {esDoctor && cita.patientId && (
              <Menu.Item
                component={Link}
                to={`/patient/${cita.patientId}/history`}
                leftSection={<FileText size={15} />}
              >
                Ver historial
              </Menu.Item>
            )}
            <Menu.Item
              color="red"
              leftSection={<CalendarX size={15} />}
              onClick={() => setCancelando(cita)}
            >
              Cancelar cita
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </>
    )

  const contraparteDe = (cita: Appointment) =>
    esDoctor ? (cita.patientName ?? 'Paciente') : nombreDoctor(cita.doctorName)

  const filas = filtradas.map((cita) => {
    const cuando = dayjs(`${cita.appointmentDate}T${cita.appointmentTime}`)
    const info = estadoDe(cita.status)
    const cerrada = esFinal(cita.status)

    return (
      <Table.Tr key={cita.id}>
        <Table.Td>
          <Text size="sm" fw={500} lineClamp={1}>
            {contraparteDe(cita)}
          </Text>
          {cita.specialty && (
            <Text size="xs" c="dimmed">
              {cita.specialty}
            </Text>
          )}
        </Table.Td>
        <Table.Td>
          <Text size="sm">{cuando.format('D [de] MMM [de] YYYY')}</Text>
          <Text size="xs" c="dimmed">
            {cuando.format('HH:mm')}
          </Text>
        </Table.Td>
        <Table.Td>
          <Badge variant="light" color={info.color}>
            {info.label}
          </Badge>
        </Table.Td>
        <Table.Td maw={260}>{notasDe(cita)}</Table.Td>
        <Table.Td>
          <Group gap={4} justify="flex-end" wrap="nowrap">
            {accionesDe(cita, cerrada)}
          </Group>
        </Table.Td>
      </Table.Tr>
    )
  })

  const tarjetas = filtradas.map((cita) => {
    const cuando = dayjs(`${cita.appointmentDate}T${cita.appointmentTime}`)
    const info = estadoDe(cita.status)
    const cerrada = esFinal(cita.status)

    return (
      <Card key={cita.id} p="md">
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <div style={{ minWidth: 0 }}>
              <Text fw={600} lineClamp={1}>
                {contraparteDe(cita)}
              </Text>
              {cita.specialty && (
                <Text size="xs" c="dimmed">
                  {cita.specialty}
                </Text>
              )}
            </div>
            <Badge variant="light" color={info.color}>
              {info.label}
            </Badge>
          </Group>

          <Text size="sm">
            {cuando.format('D [de] MMMM [de] YYYY')} · {cuando.format('HH:mm')}
          </Text>

          {notasDe(cita)}

          <Group gap={4} justify="flex-end" wrap="nowrap">
            {accionesDe(cita, cerrada)}
          </Group>
        </Stack>
      </Card>
    )
  })

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div>
          <Title order={1}>{esDoctor ? 'Citas de mi consulta' : 'Mis citas'}</Title>
          <Text c="dimmed" size="sm">
            {esDoctor
              ? 'Todo lo que te han agendado, en una lista'
              : 'Lo que tienes agendado y lo que ya pasó'}
          </Text>
        </div>
        {!esDoctor && (
          <Button component={Link} to="/doctors" leftSection={<CalendarPlus size={16} />}>
            Reservar cita
          </Button>
        )}
      </Group>

      <Group gap="sm" wrap="wrap">
        <TextInput
          flex={1}
          miw={220}
          leftSection={<Search size={16} />}
          placeholder={esDoctor ? 'Buscar por paciente' : 'Buscar por doctor o especialidad'}
          value={busqueda}
          onChange={(e) => setBusqueda(e.currentTarget.value)}
        />
        <Select
          w={200}
          data={OPCIONES_ESTADO}
          value={estado}
          onChange={(v) => setEstado(v ?? 'todas')}
          allowDeselect={false}
          aria-label="Filtrar por estado"
        />
      </Group>

      {isLoading ? (
        <Loading rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title={data?.length ? 'Nada coincide con ese filtro' : 'Todavía no hay citas'}
          description={
            data?.length
              ? 'Prueba con otro texto o quita el filtro de estado.'
              : esDoctor
                ? 'Cuando alguien te agende, aparecerá aquí.'
                : 'Busca un especialista y reserva tu primera consulta.'
          }
          action={
            !data?.length && !esDoctor ? (
              <Button component={Link} to="/doctors">
                Buscar doctor
              </Button>
            ) : undefined
          }
        />
      ) : enMovil ? (
        <Stack gap="sm">{tarjetas}</Stack>
      ) : (
        <Card p={0}>
          <Table.ScrollContainer minWidth={640}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{esDoctor ? 'Paciente' : 'Doctor'}</Table.Th>
                  <Table.Th>Cuándo</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Notas</Table.Th>
                  <Table.Th ta="right">Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{filas}</Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}

      <EditAppointmentDialog
        appointment={editando}
        onClose={() => setEditando(null)}
      />

      <Modal
        opened={cancelando !== null}
        onClose={cerrarCancelacion}
        title="Cancelar esta cita"
        centered
      >
        {cancelando && (
          <Stack gap="md">
            <div>
              <Text size="sm" fw={500}>
                {esDoctor
                  ? (cancelando.patientName ?? 'Paciente')
                  : nombreDoctor(cancelando.doctorName)}
              </Text>
              <Text size="sm" c="dimmed">
                {dayjs(
                  `${cancelando.appointmentDate}T${cancelando.appointmentTime}`,
                ).format('D [de] MMMM [de] YYYY, HH:mm')}
              </Text>
            </div>

            <Textarea
              label="Motivo"
              description="Lo verá la otra persona. No se puede deshacer."
              placeholder="Me surgió una urgencia, lo reagendo esta semana…"
              required
              autosize
              minRows={3}
              maxLength={300}
              value={motivo}
              onChange={(e) => setMotivo(e.currentTarget.value)}
              data-autofocus
            />

            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={cerrarCancelacion}>
                Dejarla como está
              </Button>
              <Button color="red" onClick={confirmarCancelacion} loading={cancelar.isPending}>
                Sí, cancelar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  )
}
