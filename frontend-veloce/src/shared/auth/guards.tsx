/** Route guards built on react-router + useAuth. */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth-context'
import type { Role } from '@/shared/api/types'

/** Requires authentication; otherwise redirects to /login. */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

/** Requires one of the given roles; otherwise redirects to /dashboard. */
export function RoleRoute({ roles }: { roles: Role[] }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return roles.includes(user.role) ? <Outlet /> : <Navigate to="/dashboard" replace />
}

/** For login/register: authenticated users are bounced to /dashboard. */
export function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}
