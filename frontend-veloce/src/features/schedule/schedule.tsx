/**
 * Horarios del doctor.
 *
 * El endpoint existía desde el principio; la pantalla no. Sin ella, un doctor
 * no podía publicar cuándo atiende, y el paciente se quedaba sin huecos que
 * escoger.
 */
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Clock, Info, Save, Sparkles } from 'lucide-react'
import { doctorsApi } from '@/shared/api/endpoints'
import { useAuth } from '@/shared/auth/auth-context'
import { avisoError, avisoExito } from '@/shared/ui/avisos'
import { Loading } from '@/components/common/states'

/** Media hora de granularidad, de 7 a 20. Cubre cualquier consultorio real. */
const TODAS = Array.from({ length: 27 }, (_, i) => {
  const minutos = 7 * 60 + i * 30
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${minutos % 60 === 0 ? '00' : '30'}`
})

const PLANTILLAS: Record<string, string[]> = {
  'Matutino (9 a 14)': ['09:00', '10:00', '11:00', '12:00', '13:00'],
  'Vespertino (15 a 20)': ['15:00', '16:00', '17:00', '18:00', '19:00'],
  'Jornada completa': ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00'],
}

export function SchedulePage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const perfil = user?.doctorInfo

  const [elegidas, setElegidas] = useState<string[]>([])
  const [tocado, setTocado] = useState(false)

  const guardadas = useMemo(
    () => (perfil?.availableHours ?? []).slice().sort(),
    [perfil?.availableHours],
  )

  useEffect(() => {
    setElegidas(guardadas)
    setTocado(false)
  }, [guardadas])

  const guardar = useMutation({
    mutationFn: () => {
      if (!perfil?.id) throw new Error('Tu perfil de doctor no está completo')
      return doctorsApi.update(perfil.id, { availableHours: elegidas })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors'] })
      qc.invalidateQueries({ queryKey: ['availability'] })
      setTocado(false)
      avisoExito('Horarios guardados', `${elegidas.length} horas publicadas`)
    },
    onError: (e) => avisoError(e, 'No se pudieron guardar los horarios'),
  })

  const alternar = (hora: string) => {
    setTocado(true)
    setElegidas((previas) =>
      previas.includes(hora)
        ? previas.filter((h) => h !== hora)
        : [...previas, hora].sort(),
    )
  }

  const aplicar = (horas: string[]) => {
    setTocado(true)
    setElegidas(horas)
  }

  if (!user) return <Loading rows={2} />

  if (!perfil?.id) {
    return (
      <Stack gap="lg">
        <Title order={1}>Mis horarios</Title>
        <Alert color="orange" icon={<Info size={18} />} title="Falta tu perfil de doctor">
          Para publicar horarios primero hay que registrar tu cédula y tu consultorio.
        </Alert>
      </Stack>
    )
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div>
          <Title order={1}>Mis horarios</Title>
          <Text c="dimmed" size="sm">
            Las horas que publiques son las que tus pacientes podrán escoger
          </Text>
        </div>
        <Button
          leftSection={<Save size={16} />}
          disabled={!tocado}
          loading={guardar.isPending}
          onClick={() => guardar.mutate()}
        >
          Guardar cambios
        </Button>
      </Group>

      <Card>
        <Group gap="xs" mb="sm">
          <Sparkles size={16} />
          <Text fw={600} size="sm">
            Empezar desde una plantilla
          </Text>
        </Group>
        <Group gap="xs" wrap="wrap">
          {Object.entries(PLANTILLAS).map(([nombre, horas]) => (
            <Button key={nombre} size="xs" variant="light" onClick={() => aplicar(horas)}>
              {nombre}
            </Button>
          ))}
          <Button size="xs" variant="subtle" color="gray" onClick={() => aplicar([])}>
            Vaciar
          </Button>
        </Group>
      </Card>

      <Card>
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <Clock size={17} />
            <Text fw={600}>Horas que atiendo</Text>
          </Group>
          <Badge variant="light" color={elegidas.length ? 'clinico' : 'gray'}>
            {elegidas.length} seleccionadas
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 3, xs: 4, sm: 6, md: 9 }} spacing="xs">
          {TODAS.map((hora) => (
            <Chip
              key={hora}
              checked={elegidas.includes(hora)}
              onChange={() => alternar(hora)}
              color="clinico"
              variant={elegidas.includes(hora) ? 'filled' : 'outline'}
              size="sm"
            >
              {hora}
            </Chip>
          ))}
        </SimpleGrid>

        {elegidas.length === 0 && (
          <Alert color="orange" icon={<Info size={16} />} mt="md">
            Sin horas publicadas, nadie puede agendar contigo.
          </Alert>
        )}
      </Card>

      {tocado && (
        <Alert color="blue" icon={<Info size={16} />}>
          Hay cambios sin guardar. Las citas ya agendadas no se tocan: quitar una hora solo
          impide que alguien la reserve de nuevo.
        </Alert>
      )}
    </Stack>
  )
}
