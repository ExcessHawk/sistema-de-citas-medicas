/**
 * Catálogo de doctores, en lista o sobre el mapa.
 *
 * El mapa no es decoración: quien busca consulta pregunta primero "¿me queda
 * cerca?", y una dirección escrita no responde eso.
 */
import { lazy, Suspense, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { CalendarPlus, List, Map as MapIcon, MapPin, Phone, Search, Stethoscope } from 'lucide-react'
import { useDoctors } from './hooks'
import { BookAppointmentDialog } from './book-dialog'
// Leaflet y sus mosaicos pesan más que el resto de la pantalla junta, y la
// mayoría entra en vista de lista. Se descarga cuando alguien pide el mapa.
const DoctorMap = lazy(() =>
  import('./doctor-map').then((m) => ({ default: m.DoctorMap })),
)
import { EmptyState, ErrorState, Loading } from '@/components/common/states'
import { nombreDoctor } from '@/shared/ui/theme'
import type { Doctor } from '@/shared/api/types'

export function DoctorsPage() {
  const { data, isLoading, isError, refetch } = useDoctors()
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<'lista' | 'mapa'>('lista')
  const [elegido, setElegido] = useState<Doctor | null>(null)
  const [especialidad, setEspecialidad] = useState<string | null>(null)

  const especialidades = useMemo(
    () => [...new Set((data ?? []).map((d) => d.specialty).filter(Boolean))] as string[],
    [data],
  )

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return (data ?? [])
      .filter((d) => (especialidad ? d.specialty === especialidad : true))
      .filter(
        (d) => !q || d.name.toLowerCase().includes(q) || (d.specialty ?? '').toLowerCase().includes(q),
      )
  }, [data, busqueda, especialidad])

  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>Doctores</Title>
        <Text c="dimmed" size="sm">
          Encuentra un especialista, mira dónde queda y reserva
        </Text>
      </div>

      <Group gap="sm" wrap="wrap">
        <TextInput
          flex={1}
          miw={220}
          leftSection={<Search size={16} />}
          placeholder="Buscar por nombre o especialidad"
          value={busqueda}
          onChange={(e) => setBusqueda(e.currentTarget.value)}
        />
        <SegmentedControl
          value={vista}
          onChange={(v) => setVista(v as 'lista' | 'mapa')}
          data={[
            {
              value: 'lista',
              label: (
                <Group gap={6} wrap="nowrap">
                  <List size={15} />
                  <span>Lista</span>
                </Group>
              ),
            },
            {
              value: 'mapa',
              label: (
                <Group gap={6} wrap="nowrap">
                  <MapIcon size={15} />
                  <span>Mapa</span>
                </Group>
              ),
            },
          ]}
        />
      </Group>

      {especialidades.length > 1 && (
        <Group gap="xs" wrap="wrap">
          <Badge
            variant={especialidad === null ? 'filled' : 'light'}
            color={especialidad === null ? 'clinico' : 'gray'}
            style={{ cursor: 'pointer' }}
            onClick={() => setEspecialidad(null)}
          >
            Todas
          </Badge>
          {especialidades.map((e) => (
            <Badge
              key={e}
              variant={especialidad === e ? 'filled' : 'light'}
              color={especialidad === e ? 'clinico' : 'gray'}
              style={{ cursor: 'pointer' }}
              onClick={() => setEspecialidad(especialidad === e ? null : e)}
            >
              {e}
            </Badge>
          ))}
        </Group>
      )}

      {isLoading ? (
        <Loading rows={3} height={140} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="Ningún doctor coincide"
          description="Prueba con otro nombre o quita el filtro de especialidad."
        />
      ) : vista === 'mapa' ? (
        <Suspense fallback={<Loading rows={1} height={360} />}>
          <DoctorMap doctors={filtrados} onBook={setElegido} />
        </Suspense>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filtrados.map((d) => (
            <Card key={d.id}>
              <Stack gap="sm" h="100%" justify="space-between">
                <div>
                  <Group gap="sm" wrap="nowrap" mb="xs">
                    <ThemeIcon variant="light" color="clinico" size={38} radius="md">
                      <Stethoscope size={19} />
                    </ThemeIcon>
                    <div style={{ minWidth: 0 }}>
                      <Text fw={600} lineClamp={1}>
                        {nombreDoctor(d.name)}
                      </Text>
                      {d.specialty && (
                        <Text size="xs" c="dimmed">
                          {d.specialty}
                        </Text>
                      )}
                    </div>
                  </Group>

                  <Stack gap={6}>
                    {d.address && (
                      <Group gap={6} wrap="nowrap" c="dimmed">
                        <MapPin size={14} style={{ flexShrink: 0 }} />
                        <Text size="xs" lineClamp={2}>
                          {d.address}
                        </Text>
                      </Group>
                    )}
                    {d.phone && (
                      <Group gap={6} wrap="nowrap" c="dimmed">
                        <Phone size={14} style={{ flexShrink: 0 }} />
                        <Text size="xs">{d.phone}</Text>
                      </Group>
                    )}
                  </Stack>
                </div>

                <Group justify="space-between" align="center">
                  {d.consultationFee ? (
                    <Text fw={600} size="sm">
                      ${Number(d.consultationFee).toLocaleString('es-MX')}
                      <Text span size="xs" c="dimmed" fw={400}>
                        {' '}
                        MXN
                      </Text>
                    </Text>
                  ) : (
                    <span />
                  )}
                  <Button size="xs" leftSection={<CalendarPlus size={14} />} onClick={() => setElegido(d)}>
                    Reservar
                  </Button>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <BookAppointmentDialog doctor={elegido} onClose={() => setElegido(null)} />
    </Stack>
  )
}
