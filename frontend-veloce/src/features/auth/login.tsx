import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import {
  Anchor,
  Button,
  Card,
  Center,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { Stethoscope } from 'lucide-react'
import { useAuth } from '@/shared/auth/auth-context'
import { avisoError, avisoExito } from '@/shared/ui/avisos'

const schema = z.object({
  email: z.string().email('Ese correo no se ve bien'),
  password: z.string().min(1, 'Falta la contraseña'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    try {
      const user = await login(values)
      avisoExito(`Bienvenido, ${user.name}`)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      avisoError(e, 'No se pudo entrar')
    }
  }

  return (
    <Center mih="100dvh" px="md">
      <Stack gap="lg" w="100%" maw={400}>
        <Stack align="center" gap="xs">
          <ThemeIcon variant="light" color="clinico" size={48} radius="md">
            <Stethoscope size={26} />
          </ThemeIcon>
          <Title order={2}>Citas Médicas</Title>
          <Text size="sm" c="dimmed">
            Entra para ver tus consultas
          </Text>
        </Stack>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Correo"
                placeholder="tu@correo.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />
              <PasswordInput
                label="Contraseña"
                placeholder="Tu contraseña"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <Button type="submit" fullWidth loading={isSubmitting}>
                Entrar
              </Button>
            </Stack>
          </form>
        </Card>

        <Group justify="center" gap={6}>
          <Text size="sm" c="dimmed">
            ¿No tienes cuenta?
          </Text>
          <Anchor component={Link} to="/register" size="sm" c="clinico">
            Regístrate
          </Anchor>
        </Group>
      </Stack>
    </Center>
  )
}
