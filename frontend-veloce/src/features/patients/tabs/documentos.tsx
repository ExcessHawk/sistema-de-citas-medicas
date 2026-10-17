import { useRef, useState } from 'react'
import {
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
import { Download, FolderOpen, Paperclip, Plus, X } from 'lucide-react'
import { useCreateDocument, useDocuments, useUploadDocumentFile } from '../hooks'
import { patientsApi } from '@/shared/api/endpoints'
import { EmptyState, Loading } from '@/components/common/states'
import { avisoError, avisoExito } from '@/shared/ui/avisos'
import { documentTypeLabel } from '@/shared/lib/format'

const VACIO = { documentType: 'prescription', title: '', description: '' }

/** Lo que el servidor acepta; se declara aquí para que el selector no ofrezca más. */
const ACEPTA = 'application/pdf,image/jpeg,image/png,image/webp'

/**
 * Un documento viejo puede traer una referencia escrita a mano en vez de un
 * archivo. Solo las claves que genera el servidor tienen algo que descargar.
 */
const CLAVE = /^[0-9a-f]{32}\.(pdf|jpg|png|webp)$/
const tieneArchivo = (filePath: string) => CLAVE.test(filePath)
const MAX_BYTES = 5 * 1024 * 1024

type Adjunto = { key: string; bytes: number; contentType: string; filename: string }

function pesoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function DocumentosTab({
  patientId,
  puedeEscribir,
}: {
  patientId: number
  puedeEscribir: boolean
}) {
  const { data, isLoading } = useDocuments(patientId)
  const crear = useCreateDocument(patientId)
  const subir = useUploadDocumentFile()
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [adjunto, setAdjunto] = useState<Adjunto | null>(null)
  const [bajando, setBajando] = useState<number | null>(null)
  const selector = useRef<HTMLInputElement>(null)

  const cerrar = () => {
    setAbierto(false)
    setForm(VACIO)
    setAdjunto(null)
  }

  const elegirArchivo = async (archivo: File | undefined) => {
    if (!archivo) return
    if (archivo.size === 0) {
      avisoError(new Error('El archivo está vacío'))
      return
    }
    if (archivo.size > MAX_BYTES) {
      avisoError(new Error(`Pesa ${pesoLegible(archivo.size)} y el límite son 5 MB`))
      return
    }
    try {
      const guardado = await subir.mutateAsync(archivo)
      setAdjunto(guardado)
      // El título se deja escribir, pero si está vacío el nombre del archivo
      // es mejor punto de partida que nada.
      setForm((f) => (f.title ? f : { ...f, title: archivo.name.replace(/\.[^.]+$/, '') }))
    } catch (e) {
      avisoError(e, 'No se pudo subir el archivo')
    } finally {
      if (selector.current) selector.current.value = ''
    }
  }

  const descargar = async (documentId: number, titulo: string) => {
    setBajando(documentId)
    try {
      const { blob, filename } = await patientsApi.downloadDocument(documentId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename ?? titulo
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      avisoError(e, 'No se pudo descargar')
    } finally {
      setBajando(null)
    }
  }

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
        filePath: adjunto?.key,
        fileSize: adjunto?.bytes,
        mimeType: adjunto?.contentType,
      })
      avisoExito('Documento registrado')
      cerrar()
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
            Recetas, estudios y radiografías. El archivo se guarda con la consulta y solo lo ve
            quien puede ver el expediente.
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
                  {d.filePath && !tieneArchivo(d.filePath) && (
                    <Text size="xs" c="dimmed" mt={4} ff="monospace" lineClamp={1}>
                      {d.filePath}
                    </Text>
                  )}
                </div>
                <Stack gap={6} align="flex-end">
                  {d.createdAt && (
                    <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      {dayjs(d.createdAt).format('D MMM YYYY')}
                    </Text>
                  )}
                  {d.filePath && tieneArchivo(d.filePath) && (
                    <Button
                      size="compact-xs"
                      variant="light"
                      leftSection={<Download size={13} />}
                      loading={bajando === d.id}
                      onClick={() => descargar(d.id, d.title)}
                    >
                      {d.fileSize ? pesoLegible(d.fileSize) : 'Descargar'}
                    </Button>
                  )}
                </Stack>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      <Modal opened={abierto} onClose={cerrar} title="Registrar documento" centered>
        <Stack gap="md">
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
          <div>
            <Text size="sm" fw={500} mb={6}>
              Archivo
            </Text>
            {adjunto ? (
              <Group gap="xs" wrap="nowrap">
                <ThemeIcon variant="light" color="clinico" size={32} radius="md">
                  <Paperclip size={16} />
                </ThemeIcon>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" lineClamp={1}>
                    {adjunto.filename}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {pesoLegible(adjunto.bytes)}
                  </Text>
                </div>
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color="gray"
                  leftSection={<X size={13} />}
                  onClick={() => setAdjunto(null)}
                >
                  Quitar
                </Button>
              </Group>
            ) : (
              <Button
                variant="default"
                leftSection={<Paperclip size={15} />}
                loading={subir.isPending}
                onClick={() => selector.current?.click()}
              >
                Escoger archivo
              </Button>
            )}
            <input
              ref={selector}
              type="file"
              accept={ACEPTA}
              hidden
              onChange={(e) => void elegirArchivo(e.currentTarget.files?.[0])}
            />
            <Text size="xs" c="dimmed" mt={6}>
              PDF, JPEG, PNG o WebP, hasta 5 MB. Opcional: un documento puede registrarse solo
              como anotación.
            </Text>
          </div>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={cerrar}>
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
