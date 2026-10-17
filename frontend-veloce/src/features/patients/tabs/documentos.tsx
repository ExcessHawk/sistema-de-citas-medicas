import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
} from '@mantine/core'
import dayjs from 'dayjs'
import { FolderOpen, Info, Plus } from 'lucide-react'
import { useCreateDocument, useDocuments } from '../hooks'
import { EmptyState, Loading } from '@/components/common/states'
import { avisoError, avisoExito } from '@/shared/ui/avisos'
import { documentTypeLabel } from '@/shared/lib/format'

const VACIO = { documentType: 'prescription', title: '', description: '', filePath: '' }

export function DocumentosTab({
  patientId,
  puedeEscribir,
}: {
  patientId: number
  puedeEscribir: boolean
}) {
  const { data, isLoading } = useDocuments(patientId)
  const crear = useCreateDocument(patientId)
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)

  const guardar = async () => {
    if (!form.title.trim()) {
      avisoError(new Error('Falta el título del documento'))
      return
    }
    try {
      await crear.mutateAsync({
        patientId,
        documentType: form.documentType as never,
        title: form.title.trim(),
        description: form.description || undefined,
        filePath: form.filePath || undefined,
      })
      avisoExito('Documento registrado')
      setAbierto(false)
      setForm(VACIO)
    } catch (e) {
      avisoError(e, 'No se pudo registrar')
    }
  }

  if (isLoading) return <Loading rows={3} />

  return (
    <Stack gap="md">
      {puedeEscribir && (
        <Group justify="space-between" align="center" wrap="wrap">
          <Text size="xs" c="dimmed" maw={420}>
            Por ahora se guarda la referencia al documento, no el archivo: la subida todavía no
            existe.
          </Text>
          <Button size="sm" leftSection={<Plus size={15} />} onClick={() => setAbierto(true)}>
            Registrar documento
          </Button>
        </Group>
      )}

      {!data || data.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Sin documentos"
          description="Recetas, estudios de laboratorio, radiografías: lo que respalda cada consulta."
        />
      ) : (
        <Stack gap="sm">
          {data.map((d) => (
            <Card key={d.id}>
              <Group gap="sm" align="flex-start" wrap="nowrap">
                <ThemeIcon variant="light" color="clinico" size={36} radius="md">
                  <FolderOpen size={18} />
                </ThemeIcon>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Group gap="xs" wrap="wrap">
                    <Text fw={600}>{d.title}</Text>
                    <Badge size="sm" variant="light" color="gray">
                      {documentTypeLabel[d.documentType] ?? d.documentType}
                    </Badge>
                  </Group>
                  {d.description && (
                    <Text size="sm" c="dimmed" mt={4} style={{ whiteSpace: 'pre-line' }}>
                      {d.description}
                    </Text>
                  )}
                  {d.filePath && (
                    <Text size="xs" c="dimmed" mt={4} ff="monospace" lineClamp={1}>
                      {d.filePath}
                    </Text>
                  )}
                </div>
                {d.createdAt && (
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    {dayjs(d.createdAt).format('D MMM YYYY')}
                  </Text>
                )}
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      <Modal
        opened={abierto}
        onClose={() => setAbierto(false)}
        title="Registrar documento"
        centered
      >
        <Stack gap="md">
          <Alert color="blue" icon={<Info size={16} />}>
            Esto anota que el documento existe y dónde está. Subir el archivo es una pieza que
            todavía no se construye.
          </Alert>

          <Select
            label="Tipo"
            data={Object.entries(documentTypeLabel).map(([value, label]) => ({ value, label }))}
            value={form.documentType}
            onChange={(v) => setForm({ ...form, documentType: v ?? 'prescription' })}
            allowDeselect={false}
          />
          <TextInput
            label="Título"
            placeholder="Biometría hemática, receta del 12 de marzo…"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.currentTarget.value })}
          />
          <Textarea
            label="Descripción"
            autosize
            minRows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.currentTarget.value })}
          />
          <TextInput
            label="Referencia o ruta"
            placeholder="Dónde está el archivo"
            value={form.filePath}
            onChange={(e) => setForm({ ...form, filePath: e.currentTarget.value })}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} loading={crear.isPending}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
