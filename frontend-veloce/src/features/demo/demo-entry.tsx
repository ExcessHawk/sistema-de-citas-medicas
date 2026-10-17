/**
 * Puerta de entrada de la demostración.
 *
 * `/demo?rol=paciente` pide una sesión al backend y aterriza al visitante en la
 * pantalla de ese rol. Sin registro, sin contraseña. Es lo que embebe el
 * portafolio en su playground.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { demoApi } from '@/shared/api/endpoints'
import { setAuth } from '@/shared/auth/token'
import { Button } from '@/components/ui/button'

type DemoRole = 'paciente' | 'doctor' | 'admin'

const ATERRIZA: Record<DemoRole, string> = {
  paciente: '/dashboard',
  doctor: '/appointments',
  admin: '/admin',
}

const ETIQUETA: Record<DemoRole, string> = {
  paciente: 'paciente',
  doctor: 'doctor',
  admin: 'administrador',
}

function esRol(valor: string | null): valor is DemoRole {
  return valor === 'paciente' || valor === 'doctor' || valor === 'admin'
}

export function DemoEntryPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const arrancado = useRef(false)

  const crudo = params.get('rol')
  const rol: DemoRole = esRol(crudo) ? crudo : 'paciente'

  useEffect(() => {
    if (arrancado.current) return
    arrancado.current = true

    demoApi
      .session(rol)
      .then((res) => {
        setAuth(res.token, res.user)
        // Recarga completa a propósito: el contexto de autenticación lee el
        // usuario al montar, y así la aplicación arranca ya con sesión en vez
        // de con un estado a medias.
        window.location.replace(ATERRIZA[rol])
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'No se pudo abrir la demostración')
      })
  }, [rol])

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">La demostración no abrió</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <p className="text-sm text-muted-foreground">
          Puedes entrar con una cuenta normal mientras tanto.
        </p>
        <Button onClick={() => navigate('/login')}>Ir a iniciar sesión</Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center gap-3 text-sm text-muted-foreground">
      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Entrando como {ETIQUETA[rol]}…
    </div>
  )
}
