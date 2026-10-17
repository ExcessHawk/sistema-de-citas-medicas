/**
 * Vista de la clínica. Lo que un administrador necesita de un vistazo:
 * cuánta gente hay, de qué tipo, y cuánto se está agendando.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Badge,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { CalendarCheck, Search, Shield, Stethoscope, Users } from 'lucide-react'
import dayjs from 'dayjs'
import { adminApi } from '@/shared/api/endpoints'
import { ErrorState, Loading } from '@/components/common/states'
import { roleLabel } from '@/shared/lib/format'

const COLOR_ROL: Record<string, string> = {
  patient: 'blue',
  doctor: 'clinico',
  admin: 'grape',
}

function Conteo({
  icono: Icono,
  valor,
  etiqueta,
  color,
}: {
  icono: typeof Users
  valor: number
  etiqueta: string
  color: string
}) {
  return (
    <Paper p="sm" radius="md">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon variant="light" color={color} size={34} radius="md">
          <Icono size={18} />
        </ThemeIcon>
        <div>
          <Text fw={700} fz="lg" lh={1.1}>
            {valor}
          </Text>
          <Text size="xs" c="dimmed">
            {etiqueta}
          </Text>
        </div>
      </Group>
    </Paper>
  )
}

export function AdminPage() {
  // Cuatro columnas no caben en un teléfono: ahí cada usuario es una tarjeta.
  const enMovil = useMediaQuery('(max-width: 48em)')
  const { data: conteos } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.stats })
  const {
    data: usuarios,
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.users })

  const [busqueda, setBusqueda] = useState('')

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return usuarios?.users ?? []
    return (usuarios?.users ?? []).filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [usuarios, busqueda])

  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>Plataforma</Title>
        <Text c="dimmed" size="sm">
          Quién está dado de alta y cuánto se agenda
        </Text>
      </div>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        <Conteo icono={Users} color="blue" valor={conteos?.users.totalUsers ?? 0} etiqueta="Usuarios" />
        <Conteo icono={Users} color="cyan" valor={conteos?.users.patients ?? 0} etiqueta="Pacientes" />
        <Conteo
          icono={Stethoscope}
          color="clinico"
          valor={conteos?.users.doctors ?? 0}
          etiqueta="Doctores"
        />
        <Conteo
          icono={CalendarCheck}
          color="grape"
          valor={conteos?.appointments.totalAppointments ?? 0}
          etiqueta="Citas totales"
        />
      </SimpleGrid>

      <Card p={0}>
        <Group justify="space-between" p="md" pb="sm" wrap="wrap">
          <Group gap="xs">
            <Shield size={17} />
            <Text fw={600}>Usuarios</Text>
            <Badge variant="light" color="gray" size="sm">
              {filtrados.length}
            </Badge>
          </Group>
          <TextInput
            w={260}
            size="xs"
            leftSection={<Search size={14} />}
            placeholder="Buscar por nombre o correo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.currentTarget.value)}
          />
        </Group>

        {isLoading ? (
          <div style={{ padding: 16 }}>
            <Loading rows={4} height={44} />
          </div>
        ) : isError ? (
          <div style={{ padding: 16 }}>
            <ErrorState onRetry={() => refetch()} />
          </div>
        ) : enMovil ? (
          <Stack gap="sm" p="md">
            {filtrados.map((u) => (
              <Card key={u.id} p="sm" withBorder={false} bg="var(--mantine-color-default-hover)">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} lineClamp={1}>
                      {u.name}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {u.email}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      Alta: {dayjs(u.createdAt).format('D MMM YYYY')}
                    </Text>
                  </div>
                  <Badge variant="light" color={COLOR_ROL[u.role] ?? 'gray'}>
                    {roleLabel[u.role] ?? u.role}
                  </Badge>
                </Group>
              </Card>
            ))}
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth={560}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nombre</Table.Th>
                  <Table.Th>Correo</Table.Th>
                  <Table.Th>Rol</Table.Th>
                  <Table.Th>Alta</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtrados.map((u) => (
                  <Table.Tr key={u.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {u.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {u.email}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={COLOR_ROL[u.role] ?? 'gray'}>
                        {roleLabel[u.role] ?? u.role}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{dayjs(u.createdAt).format('D MMM YYYY')}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </Stack>
  )
}
