/**
 * Armazón de la aplicación.
 *
 * Barra lateral en escritorio y cajón plegable en móvil, con la navegación
 * recortada por rol: un paciente no debe ver siquiera el enlace a la agenda
 * del doctor.
 */
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Group,
  Menu,
  NavLink as MantineNavLink,
  Stack,
  Text,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Moon,
  Clock,
  Shield,
  Stethoscope,
  Sun,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '@/shared/auth/auth-context'

type Enlace = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles?: string[]
}

const ENLACES: Enlace[] = [
  { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { to: '/doctors', label: 'Doctores', icon: Stethoscope, roles: ['patient', 'admin'] },
  { to: '/appointments', label: 'Citas', icon: CalendarDays },
  { to: '/agenda', label: 'Mi agenda', icon: ClipboardList, roles: ['doctor', 'admin'] },
  { to: '/schedule', label: 'Mis horarios', icon: Clock, roles: ['doctor'] },
  { to: '/admin', label: 'Plataforma', icon: Shield, roles: ['admin'] },
]

function CambioDeTema() {
  const { setColorScheme } = useMantineColorScheme()
  const actual = useComputedColorScheme('light', { getInitialValueInEffect: true })
  const oscuro = actual === 'dark'

  return (
    <Tooltip label={oscuro ? 'Modo claro' : 'Modo oscuro'} position="bottom">
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        onClick={() => setColorScheme(oscuro ? 'light' : 'dark')}
      >
        {oscuro ? <Sun size={18} /> : <Moon size={18} />}
      </ActionIcon>
    </Tooltip>
  )
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const [abierto, { toggle, close }] = useDisclosure(false)

  const rol = user?.role ?? 'patient'
  const visibles = ENLACES.filter((e) => !e.roles || e.roles.includes(rol))

  const iniciales = (user?.name ?? '')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 230, breakpoint: 'sm', collapsed: { mobile: !abierto } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={abierto} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Menú" />
            <Link to="/dashboard" style={{ textDecoration: 'none' }}>
              <Group gap={8} wrap="nowrap">
                <Stethoscope size={20} color="var(--mantine-color-clinico-6)" />
                <Text fw={650} c="var(--mantine-color-text)">
                  Citas Médicas
                </Text>
              </Group>
            </Link>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <CambioDeTema />

            <Menu position="bottom-end" width={210} shadow="md">
              <Menu.Target>
                <Group gap={8} style={{ cursor: 'pointer' }} wrap="nowrap">
                  <Avatar color="clinico" radius="xl" size={32}>
                    {iniciales || <UserIcon size={16} />}
                  </Avatar>
                  <Text size="sm" visibleFrom="xs" lineClamp={1} maw={160}>
                    {user?.name}
                  </Text>
                </Group>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>{user?.email}</Menu.Label>
                <Menu.Item component={Link} to="/profile" leftSection={<UserIcon size={15} />}>
                  Mi perfil
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<LogOut size={15} />} onClick={logout}>
                  Cerrar sesión
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <Stack gap={2}>
          {visibles.map(({ to, label, icon: Icono }) => (
            <MantineNavLink
              key={to}
              component={NavLink}
              to={to}
              label={label}
              leftSection={<Icono size={17} />}
              onClick={close}
              style={({ isActive }: { isActive: boolean }) => ({
                borderRadius: 'var(--mantine-radius-md)',
                backgroundColor: isActive
                  ? 'var(--mantine-color-clinico-light)'
                  : undefined,
                color: isActive ? 'var(--mantine-color-clinico-light-color)' : undefined,
                fontWeight: isActive ? 600 : undefined,
              })}
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
