/**
 * Expediente de un paciente.
 *
 * Cuatro cosas distintas con el mismo dueño: lo que pasó en cada consulta, lo
 * que hay que vigilar después, lo que arrastra de siempre y los papeles. Cada
 * una vive en su archivo; este solo las reparte en pestañas.
 */
import { useParams } from 'react-router-dom'
import { Alert, Group, Stack, Tabs, Text, Title } from '@mantine/core'
import { Activity, AlertTriangle, FileText, FolderOpen, Repeat } from 'lucide-react'
import { useAuth } from '@/shared/auth/auth-context'
import { HistorialTab } from './tabs/historial'
import { SeguimientosTab } from './tabs/seguimientos'
import { PadecimientosTab } from './tabs/padecimientos'
import { DocumentosTab } from './tabs/documentos'

export function MedicalHistoryPage() {
  const { patientId } = useParams()
  const { user } = useAuth()

  const id = Number(patientId)
  const puedeEscribir = user?.role === 'doctor' || user?.role === 'admin'

  if (!Number.isFinite(id)) {
    return (
      <Alert color="red" icon={<AlertTriangle size={18} />} title="Paciente no válido">
        El identificador de la URL no corresponde a ningún paciente.
      </Alert>
    )
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>Expediente clínico</Title>
        <Text c="dimmed" size="sm">
          {puedeEscribir
            ? 'Consulta y escribe lo que corresponda a este paciente'
            : 'Todo lo que se ha registrado de tus consultas'}
        </Text>
      </div>

      <Tabs defaultValue="historial" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="historial" leftSection={<FileText size={15} />}>
            Consultas
          </Tabs.Tab>
          <Tabs.Tab value="seguimientos" leftSection={<Repeat size={15} />}>
            Seguimientos
          </Tabs.Tab>
          <Tabs.Tab value="padecimientos" leftSection={<Activity size={15} />}>
            Padecimientos
          </Tabs.Tab>
          <Tabs.Tab value="documentos" leftSection={<FolderOpen size={15} />}>
            Documentos
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="historial" pt="md">
          <HistorialTab patientId={id} puedeEscribir={puedeEscribir} />
        </Tabs.Panel>
        <Tabs.Panel value="seguimientos" pt="md">
          <SeguimientosTab patientId={id} puedeEscribir={puedeEscribir} />
        </Tabs.Panel>
        <Tabs.Panel value="padecimientos" pt="md">
          <PadecimientosTab patientId={id} puedeEscribir={puedeEscribir} />
        </Tabs.Panel>
        <Tabs.Panel value="documentos" pt="md">
          <DocumentosTab patientId={id} puedeEscribir={puedeEscribir} />
        </Tabs.Panel>
      </Tabs>

      {!puedeEscribir && (
        <Group gap={6} c="dimmed">
          <Text size="xs">Solo tu doctor puede escribir en este expediente.</Text>
        </Group>
      )}
    </Stack>
  )
}
