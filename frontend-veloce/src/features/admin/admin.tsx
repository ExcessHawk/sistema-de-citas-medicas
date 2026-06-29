import { useQuery } from '@tanstack/react-query'
import { Users, Stethoscope, Shield, CalendarCheck } from 'lucide-react'
import { adminApi } from '@/shared/api/endpoints'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loading } from '@/components/common/states'
import { formatDate, roleLabel } from '@/shared/lib/format'

export function AdminPage() {
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.stats })
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.users,
  })

  const cards = [
    { label: 'Usuarios', value: stats?.users.totalUsers ?? 0, icon: Users },
    { label: 'Pacientes', value: stats?.users.patients ?? 0, icon: Users },
    { label: 'Doctores', value: stats?.users.doctors ?? 0, icon: Stethoscope },
    { label: 'Citas totales', value: stats?.appointments.totalAppointments ?? 0, icon: CalendarCheck },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel de administración</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <c.icon className="size-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" /> Usuarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loading />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData?.users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{roleLabel[u.role] ?? u.role}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(u.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
