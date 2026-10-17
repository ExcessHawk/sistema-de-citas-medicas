/**
 * Los tres estados que toda pantalla con datos tiene que resolver: cargando,
 * vacío y roto. Antes cada una los dibujaba a su manera.
 */
import type { ReactNode } from 'react'
import { Alert, Button, Center, Loader, Paper, Skeleton, Stack, Text } from '@mantine/core'
import { AlertCircle, Inbox } from 'lucide-react'

export function Loading({ rows = 3, height = 64 }: { rows?: number; height?: number }) {
  return (
    <Stack gap="sm">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={height} radius="md" />
      ))}
    </Stack>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <Center py="xl">
      <Stack align="center" gap="xs">
        <Loader size="sm" color="clinico" />
        {label && (
          <Text size="sm" c="dimmed">
            {label}
          </Text>
        )}
      </Stack>
    </Center>
  )
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ size?: number | string }>
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <Paper
      withBorder
      radius="md"
      py={48}
      px="lg"
      style={{ borderStyle: 'dashed', background: 'transparent' }}
    >
      <Stack align="center" gap="xs" ta="center">
        <Icon size={38} />
        <Text fw={600}>{title}</Text>
        {description && (
          <Text size="sm" c="dimmed" maw={420}>
            {description}
          </Text>
        )}
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </Stack>
    </Paper>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudieron cargar los datos">
      <Stack gap="sm" align="flex-start">
        <Text size="sm">{message || 'Ocurrió un error al hablar con el servidor.'}</Text>
        {onRetry && (
          <Button size="xs" variant="light" color="red" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </Stack>
    </Alert>
  )
}
