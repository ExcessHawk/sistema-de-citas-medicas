import { Link } from 'react-router-dom'
import {
  Button,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { CalendarCheck, Clock, MapPin, ShieldCheck, Stethoscope } from 'lucide-react'
import { useAuth } from '@/shared/auth/auth-context'

const VENTAJAS = [
  {
    icon: MapPin,
    title: 'Ves dónde queda',
    desc: 'Los consultorios en un mapa, antes de reservar.',
  },
  {
    icon: CalendarCheck,
    title: 'Escoges el hueco',
    desc: 'Los horarios libres del doctor, sobre una cuadrícula.',
  },
  {
    icon: Clock,
    title: 'No se te olvida',
    desc: 'Recordatorio por correo la víspera de tu cita.',
  },
  {
    icon: ShieldCheck,
    title: 'Tu historial, tuyo',
    desc: 'Consultas, estudios y padecimientos en un solo lugar.',
  },
]

export function HomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <div>
      <header
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Container size="lg" h={56}>
          <Group h="100%" justify="space-between">
            <Group gap={8}>
              <Stethoscope size={20} color="var(--mantine-color-clinico-6)" />
              <Text fw={650}>Citas Médicas</Text>
            </Group>

            <Group gap="xs">
              {isAuthenticated ? (
                <Button component={Link} to="/dashboard" size="sm">
                  Ir a mi panel
                </Button>
              ) : (
                <>
                  <Button component={Link} to="/login" variant="subtle" size="sm">
                    Entrar
                  </Button>
                  <Button component={Link} to="/register" size="sm">
                    Crear cuenta
                  </Button>
                </>
              )}
            </Group>
          </Group>
        </Container>
      </header>

      <Container size="lg" py={80}>
        <Stack align="center" gap="md" ta="center">
          <Title order={1} fz={{ base: 32, sm: 44 }} maw={720} lh={1.15}>
            Tu consulta, agendada sin llamadas ni esperas
          </Title>
          <Text c="dimmed" maw={560}>
            Busca especialista, mira en el mapa dónde atiende, escoge el horario que te queda y
            lleva tu historial contigo.
          </Text>
          <Group gap="sm" mt="md">
            <Button component={Link} to={isAuthenticated ? '/doctors' : '/register'} size="md">
              Reservar una cita
            </Button>
            <Button component={Link} to="/login" size="md" variant="default">
              Ya tengo cuenta
            </Button>
          </Group>
        </Stack>
      </Container>

      <Container size="lg" pb={80}>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          {VENTAJAS.map(({ icon: Icono, title, desc }) => (
            <Card key={title}>
              <ThemeIcon variant="light" color="clinico" size={38} radius="md" mb="sm">
                <Icono size={19} />
              </ThemeIcon>
              <Text fw={600}>{title}</Text>
              <Text size="sm" c="dimmed" mt={4}>
                {desc}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </div>
  )
}
