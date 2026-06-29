import { Link } from 'react-router-dom'
import { CalendarCheck, Clock, ShieldCheck, Stethoscope } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/shared/auth/auth-context'
import { cn } from '@/lib/utils'

const features = [
  { icon: Stethoscope, title: 'Doctores verificados', desc: 'Encuentra especialistas por área.' },
  { icon: CalendarCheck, title: 'Reserva en segundos', desc: 'Agenda según disponibilidad real.' },
  { icon: Clock, title: 'Recordatorios', desc: 'Avisos por correo antes de tu cita.' },
  { icon: ShieldCheck, title: 'Historial seguro', desc: 'Tu información clínica protegida.' },
]

export function HomePage() {
  const { isAuthenticated } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 font-semibold">
            <Stethoscope className="size-5 text-primary" /> Citas Médicas
          </span>
          <div className="flex gap-2">
            {isAuthenticated ? (
              <Link to="/dashboard" className={cn(buttonVariants())}>
                Ir al panel
              </Link>
            ) : (
              <>
                <Link to="/login" className={cn(buttonVariants({ variant: 'ghost' }))}>
                  Entrar
                </Link>
                <Link to="/register" className={cn(buttonVariants())}>
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Tu salud, agendada sin complicaciones
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground">
          Reserva citas con especialistas, gestiona tu historial médico y recibe recordatorios, todo
          en un solo lugar.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to={isAuthenticated ? '/doctors' : '/register'}
            className={cn(buttonVariants({ size: 'lg' }))}
          >
            Reservar una cita
          </Link>
          <Link to="/login" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }))}>
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <Card key={f.title}>
            <CardContent className="pt-6">
              <f.icon className="mb-3 size-7 text-primary" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
