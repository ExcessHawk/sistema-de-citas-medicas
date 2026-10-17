import { Link } from 'react-router-dom'
import { Button, Center, Stack, Text, Title } from '@mantine/core'

export function NotFoundPage() {
  return (
    <Center mih="100dvh" px="md">
      <Stack align="center" gap="sm" ta="center">
        <Text fz={64} fw={700} c="dimmed" lh={1}>
          404
        </Text>
        <Title order={2}>Esta página no existe</Title>
        <Text size="sm" c="dimmed" maw={340}>
          Puede que el enlace esté roto o que la hayamos movido.
        </Text>
        <Button component={Link} to="/" mt="sm">
          Volver al inicio
        </Button>
      </Stack>
    </Center>
  )
}
