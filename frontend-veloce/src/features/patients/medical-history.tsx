import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Activity, AlertTriangle, Clock, FileText, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/shared/auth/auth-context'
import {
  useConditions,
  useCreateCondition,
  useCreateDocument,
  useCreateFollowUp,
  useCreateHistory,
  useDocuments,
  useFollowUps,
  useHistory,
} from './hooks'
import { ApiError } from '@/shared/api/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loading, EmptyState } from '@/components/common/states'
import { FollowUpStatusBadge } from '@/components/common/status-badge'
import {
  conditionTypeLabel,
  documentTypeLabel,
  followUpTypeLabel,
  formatDate,
  severityLabel,
} from '@/shared/lib/format'

export function MedicalHistoryPage() {
  const { patientId } = useParams()
  const pid = Number(patientId)
  const { isDoctor, isAdmin } = useAuth()
  const canWrite = isDoctor || isAdmin

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Historial médico</h1>
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="followups">Seguimientos</TabsTrigger>
          <TabsTrigger value="conditions">Condiciones</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <HistoryTab patientId={pid} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="followups" className="mt-4">
          <FollowUpsTab patientId={pid} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="conditions" className="mt-4">
          <ConditionsTab patientId={pid} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <DocumentsTab patientId={pid} canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
  )
}

// ─── History ──────────────────────────────────────────────────────────────────

function HistoryTab({ patientId, canWrite }: { patientId: number; canWrite: boolean }) {
  const { data, isLoading } = useHistory(patientId)
  const create = useCreateHistory(patientId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    visitDate: '',
    symptoms: '',
    diagnosis: '',
    treatment: '',
    medications: '',
    recommendations: '',
    nextVisitDate: '',
  })

  const submit = async () => {
    if (!form.visitDate) return toast.error('La fecha de visita es requerida')
    try {
      await create.mutateAsync({
        visitDate: form.visitDate,
        symptoms: form.symptoms || undefined,
        diagnosis: form.diagnosis || undefined,
        treatment: form.treatment || undefined,
        medications: form.medications || undefined,
        recommendations: form.recommendations || undefined,
        nextVisitDate: form.nextVisitDate || undefined,
      })
      toast.success('Entrada creada')
      setOpen(false)
      setForm({ visitDate: '', symptoms: '', diagnosis: '', treatment: '', medications: '', recommendations: '', nextVisitDate: '' })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al crear')
    }
  }

  if (isLoading) return <Loading />

  return (
    <div>
      <SectionHeader
        title="Historial de visitas"
        action={
          canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="size-4" /> Nueva entrada
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva entrada de historial</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <LabeledInput label="Fecha de visita *" type="date" value={form.visitDate} onChange={(v) => setForm({ ...form, visitDate: v })} />
                  <LabeledInput label="Próxima visita" type="date" value={form.nextVisitDate} onChange={(v) => setForm({ ...form, nextVisitDate: v })} />
                  <LabeledArea label="Síntomas" value={form.symptoms} onChange={(v) => setForm({ ...form, symptoms: v })} />
                  <LabeledArea label="Diagnóstico" value={form.diagnosis} onChange={(v) => setForm({ ...form, diagnosis: v })} />
                  <LabeledArea label="Tratamiento" value={form.treatment} onChange={(v) => setForm({ ...form, treatment: v })} />
                  <LabeledArea label="Medicamentos" value={form.medications} onChange={(v) => setForm({ ...form, medications: v })} />
                </div>
                <DialogFooter>
                  <Button onClick={submit} disabled={create.isPending}>
                    {create.isPending ? 'Guardando…' : 'Guardar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />
      {!data || data.length === 0 ? (
        <EmptyState icon={FileText} title="Sin historial médico" />
      ) : (
        <div className="space-y-3">
          {data.map((e) => (
            <Card key={e.id}>
              <CardContent className="space-y-2 pt-6">
                <div className="flex justify-between">
                  <p className="font-semibold">{formatDate(e.visitDate)}</p>
                  {e.doctorName && (
                    <p className="text-sm text-muted-foreground">Dr. {e.doctorName}</p>
                  )}
                </div>
                {e.diagnosis && <Detail label="Diagnóstico" value={e.diagnosis} />}
                {e.treatment && <Detail label="Tratamiento" value={e.treatment} />}
                {e.medications && <Detail label="Medicamentos" value={e.medications} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Follow-ups ───────────────────────────────────────────────────────────────

function FollowUpsTab({ patientId, canWrite }: { patientId: number; canWrite: boolean }) {
  const { data, isLoading } = useFollowUps(patientId)
  const create = useCreateFollowUp(patientId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ followUpType: 'routine', scheduledDate: '', notes: '' })

  const submit = async () => {
    if (!form.scheduledDate) return toast.error('La fecha es requerida')
    try {
      await create.mutateAsync({
        patientId,
        followUpType: form.followUpType as never,
        scheduledDate: form.scheduledDate,
        notes: form.notes || undefined,
      })
      toast.success('Seguimiento creado')
      setOpen(false)
      setForm({ followUpType: 'routine', scheduledDate: '', notes: '' })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al crear')
    }
  }

  if (isLoading) return <Loading />

  return (
    <div>
      <SectionHeader
        title="Seguimientos"
        action={
          canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="size-4" /> Nuevo seguimiento
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo seguimiento</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <LabeledSelect
                    label="Tipo"
                    value={form.followUpType}
                    onChange={(v) => setForm({ ...form, followUpType: v })}
                    options={Object.entries(followUpTypeLabel)}
                  />
                  <LabeledInput label="Fecha programada *" type="date" value={form.scheduledDate} onChange={(v) => setForm({ ...form, scheduledDate: v })} />
                  <LabeledArea label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
                </div>
                <DialogFooter>
                  <Button onClick={submit} disabled={create.isPending}>Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />
      {!data || data.length === 0 ? (
        <EmptyState icon={Clock} title="Sin seguimientos" />
      ) : (
        <div className="space-y-3">
          {data.map((f) => (
            <Card key={f.id}>
              <CardContent className="space-y-2 pt-6">
                <div className="flex justify-between">
                  <p className="font-semibold">{formatDate(f.scheduledDate)}</p>
                  <FollowUpStatusBadge status={f.status} />
                </div>
                <p className="text-sm text-muted-foreground">{followUpTypeLabel[f.followUpType]}</p>
                {f.notes && <Detail label="Notas" value={f.notes} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Conditions ───────────────────────────────────────────────────────────────

function ConditionsTab({ patientId, canWrite }: { patientId: number; canWrite: boolean }) {
  const { data, isLoading } = useConditions(patientId)
  const create = useCreateCondition(patientId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ conditionType: 'allergy', name: '', description: '', severity: '', diagnosisDate: '' })

  const submit = async () => {
    if (!form.name) return toast.error('El nombre es requerido')
    try {
      await create.mutateAsync({
        patientId,
        conditionType: form.conditionType as never,
        name: form.name,
        description: form.description || undefined,
        severity: (form.severity || undefined) as never,
        diagnosisDate: form.diagnosisDate || undefined,
      })
      toast.success('Condición agregada')
      setOpen(false)
      setForm({ conditionType: 'allergy', name: '', description: '', severity: '', diagnosisDate: '' })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al crear')
    }
  }

  if (isLoading) return <Loading />

  return (
    <div>
      <SectionHeader
        title="Condiciones médicas"
        action={
          canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="size-4" /> Agregar condición
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva condición</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <LabeledSelect label="Tipo" value={form.conditionType} onChange={(v) => setForm({ ...form, conditionType: v })} options={Object.entries(conditionTypeLabel)} />
                  <LabeledInput label="Nombre *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                  <LabeledSelect label="Severidad" value={form.severity} onChange={(v) => setForm({ ...form, severity: v })} options={Object.entries(severityLabel)} placeholder="Sin especificar" />
                  <LabeledInput label="Fecha de diagnóstico" type="date" value={form.diagnosisDate} onChange={(v) => setForm({ ...form, diagnosisDate: v })} />
                  <LabeledArea label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
                </div>
                <DialogFooter>
                  <Button onClick={submit} disabled={create.isPending}>Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />
      {!data || data.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="Sin condiciones registradas" />
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-2 pt-6">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{c.name}</p>
                  <div className="flex gap-2">
                    {c.severity && <Badge variant="secondary">{severityLabel[c.severity]}</Badge>}
                    <Badge variant={c.isActive ? 'default' : 'secondary'}>
                      {c.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{conditionTypeLabel[c.conditionType]}</p>
                {c.description && <Detail label="Descripción" value={c.description} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Documents ────────────────────────────────────────────────────────────────

function DocumentsTab({ patientId, canWrite }: { patientId: number; canWrite: boolean }) {
  const { data, isLoading } = useDocuments(patientId)
  const create = useCreateDocument(patientId)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ documentType: 'prescription', title: '', description: '', filePath: '' })

  const submit = async () => {
    if (!form.title) return toast.error('El título es requerido')
    try {
      await create.mutateAsync({
        patientId,
        documentType: form.documentType as never,
        title: form.title,
        description: form.description || undefined,
        filePath: form.filePath || undefined,
      })
      toast.success('Documento agregado')
      setOpen(false)
      setForm({ documentType: 'prescription', title: '', description: '', filePath: '' })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al crear')
    }
  }

  if (isLoading) return <Loading />

  return (
    <div>
      <SectionHeader
        title="Documentos"
        action={
          canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="size-4" /> Agregar documento
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo documento</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <LabeledSelect label="Tipo" value={form.documentType} onChange={(v) => setForm({ ...form, documentType: v })} options={Object.entries(documentTypeLabel)} />
                  <LabeledInput label="Título *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
                  <LabeledInput label="Ruta / URL del archivo" value={form.filePath} onChange={(v) => setForm({ ...form, filePath: v })} />
                  <LabeledArea label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
                </div>
                <DialogFooter>
                  <Button onClick={submit} disabled={create.isPending}>Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />
      {!data || data.length === 0 ? (
        <EmptyState icon={Activity} title="Sin documentos" />
      ) : (
        <div className="space-y-3">
          {data.map((d) => (
            <Card key={d.id}>
              <CardContent className="space-y-2 pt-6">
                <div className="flex justify-between">
                  <p className="font-semibold">{d.title}</p>
                  <span className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{documentTypeLabel[d.documentType]}</p>
                {d.description && <Detail label="Descripción" value={d.description} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Small form helpers ───────────────────────────────────────────────────────

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function LabeledArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: [string, string][]
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v ?? '')}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(([val, lbl]) => (
            <SelectItem key={val} value={val}>
              {lbl}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
