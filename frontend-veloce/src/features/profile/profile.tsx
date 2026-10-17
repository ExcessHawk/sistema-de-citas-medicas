import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  NumberInput,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import dayjs from 'dayjs'
import { KeyRound, Save } from 'lucide-react'
import { useAuth } from '@/shared/auth/auth-context'
import { authApi } from '@/shared/api/endpoints'
import { avisoError, avisoExito } from '@/shared/ui/avisos'
import { roleLabel } from '@/shared/lib/format'

export function ProfilePage() {
  const { user, setUser, isDoctor } = useAuth()

  const [nombre, setNombre] = useState(user?.name ?? '')
  const [telefono, setTelefono] = useState(user?.doctorInfo?.phone ?? '')
  const [direccion, setDireccion] = useState(user?.doctorInfo?.address ?? '')
  const [especialidad, setEspecialidad] = useState(user?.doctorInfo?.specialty ?? '')
  const [tarifa, setTarifa] = useState<number | string>(
    user?.doctorInfo?.consultationFee ? Number(user.doctorInfo.consultationFee) : '',
  )
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [guardandoClave, setGuardandoClave] = useState(false)

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoPerfil(true)
    try {
      const actualizado = await authApi.updateProfile({
        name: nombre || undefined,
        phone: telefono || undefined,
        address: direccion || undefined,
        specialty: isDoctor ? especialidad || undefined : undefined,
        consultationFee: isDoctor && tarifa !== '' ? Number(tarifa) : undefined,
      })
      setUser(actualizado)
      avisoExito('Perfil actualizado')
    } catch (e2) {
      avisoError(e2, 'No se pudo guardar el perfil')
    } finally {
      setGuardandoPerfil(false)
    }
  }

  const cambiarClave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoClave(true)
    try {
      await authApi.changePassword({ currentPassword: actual, newPassword: nueva })
      setActual('')
      setNueva('')
      avisoExito('Contraseña cambiada')
    } catch (e2) {
      avisoError(e2, 'No se pudo cambiar la contraseña')
    } finally {
      setGuardandoClave(false)
    }
  }

  return (
    <Stack gap="lg" maw={720}>
      <div>
        <Title order={1}>Mi perfil</Title>
        <Text c="dimmed" size="sm">
          Tus datos y tu contraseña
        </Text>
      </div>

      <Card>
        <Group justify="space-between" mb="md" wrap="wrap">
          <div>
            <Text fw={600}>{user?.name}</Text>
            <Text size="sm" c="dimmed">
              {user?.email}
            </Text>
          </div>
          <Group gap="xs">
            <Badge variant="light" color="clinico">
              {roleLabel[user?.role ?? ''] ?? user?.role}
            </Badge>
            {user?.createdAt && (
              <Text size="xs" c="dimmed">
                Desde {dayjs(user.createdAt).format('MMMM [de] YYYY')}
              </Text>
            )}
          </Group>
        </Group>

        <Divider mb="md" />

        <form onSubmit={guardarPerfil}>
          <Stack gap="md">
            <TextInput
              label="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.currentTarget.value)}
            />
            <Group grow align="flex-start">
              <TextInput
                label="Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.currentTarget.value)}
              />
              <TextInput
                label={isDoctor ? 'Dirección del consultorio' : 'Dirección'}
                value={direccion}
                onChange={(e) => setDireccion(e.currentTarget.value)}
              />
            </Group>

            {isDoctor && (
              <Group grow align="flex-start">
                <TextInput
                  label="Especialidad"
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.currentTarget.value)}
                />
                <NumberInput
                  label="Costo de consulta"
                  prefix="$"
                  thousandSeparator
                  min={0}
                  value={tarifa}
                  onChange={setTarifa}
                />
              </Group>
            )}

            <Group justify="flex-end">
              <Button type="submit" leftSection={<Save size={16} />} loading={guardandoPerfil}>
                Guardar
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      <Card>
        <Group gap="xs" mb="md">
          <KeyRound size={17} />
          <Text fw={600}>Cambiar contraseña</Text>
        </Group>

        <form onSubmit={cambiarClave}>
          <Stack gap="md">
            <PasswordInput
              label="Contraseña actual"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Contraseña nueva"
              description="Mínimo 8 caracteres"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.currentTarget.value)}
              required
            />
            <Group justify="flex-end">
              <Button
                type="submit"
                variant="default"
                loading={guardandoClave}
                disabled={!actual || nueva.length < 8}
              >
                Cambiar contraseña
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  )
}
