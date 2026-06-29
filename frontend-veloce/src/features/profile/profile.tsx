import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/shared/auth/auth-context'
import { authApi } from '@/shared/api/endpoints'
import { ApiError } from '@/shared/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatDate, roleLabel } from '@/shared/lib/format'

export function ProfilePage() {
  const { user, setUser, isDoctor } = useAuth()

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.doctorInfo?.phone ?? '')
  const [address, setAddress] = useState(user?.doctorInfo?.address ?? '')
  const [specialty, setSpecialty] = useState(user?.doctorInfo?.specialty ?? '')
  const [fee, setFee] = useState(user?.doctorInfo?.consultationFee ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const updated = await authApi.updateProfile({
        name: name || undefined,
        phone: phone || undefined,
        address: address || undefined,
        specialty: isDoctor ? specialty || undefined : undefined,
        consultationFee: isDoctor && fee ? Number(fee) : undefined,
      })
      setUser(updated)
      toast.success('Perfil actualizado')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al actualizar')
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPw(true)
    try {
      await authApi.changePassword({ currentPassword, newPassword })
      toast.success('Contraseña actualizada')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al cambiar contraseña')
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <Badge variant="secondary">{roleLabel[user?.role ?? ''] ?? user?.role}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información personal</CardTitle>
            <CardDescription>
              Miembro desde {formatDate(user?.createdAt)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Correo</Label>
                <Input value={user?.email ?? ''} disabled />
              </div>
              {isDoctor && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="specialty">Especialidad</Label>
                    <Input
                      id="specialty"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="fee">Tarifa ($)</Label>
                      <Input
                        id="fee"
                        type="number"
                        value={fee}
                        onChange={(e) => setFee(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </>
              )}
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cambiar contraseña</CardTitle>
            <CardDescription>Mínimo 8 caracteres</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={savePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cpw">Contraseña actual</Label>
                <Input
                  id="cpw"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="npw">Nueva contraseña</Label>
                <Input
                  id="npw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" disabled={savingPw}>
                {savingPw ? 'Guardando…' : 'Actualizar contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
