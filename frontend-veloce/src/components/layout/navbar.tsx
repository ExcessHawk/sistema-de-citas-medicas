import { Link, NavLink } from 'react-router-dom'
import { CalendarDays, LogOut, Stethoscope, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/shared/auth/auth-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-medium transition-colors hover:text-foreground',
    isActive ? 'text-foreground' : 'text-muted-foreground',
  )

export function Navbar() {
  const { user, isAdmin, logout } = useAuth()

  const initials = user?.name
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
          <Stethoscope className="size-5 text-primary" />
          <span>Citas Médicas</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/dashboard" className={linkClass}>
            Inicio
          </NavLink>
          <NavLink to="/doctors" className={linkClass}>
            Doctores
          </NavLink>
          <NavLink to="/appointments" className={linkClass}>
            Citas
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs">
                    {initials || <UserIcon className="size-4" />}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm sm:inline">{user?.name}</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link to="/profile" />}>
              <UserIcon className="size-4" /> Perfil
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link to="/appointments" />}>
              <CalendarDays className="size-4" /> Mis citas
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} variant="destructive">
              <LogOut className="size-4" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
