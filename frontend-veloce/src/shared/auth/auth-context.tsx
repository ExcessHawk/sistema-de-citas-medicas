/**
 * Auth context: holds the current user (hydrated from localStorage), exposes
 * login/register/logout/refresh. Server data lives in React Query; this only
 * owns identity/session.
 */
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/shared/api/endpoints'
import type { LoginPayload, RegisterPayload, User } from '@/shared/api/types'
import { clearAuth, getStoredUser, setAuth, setStoredUser } from './token'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isDoctor: boolean
  login: (payload: LoginPayload) => Promise<User>
  register: (payload: RegisterPayload) => Promise<User>
  logout: () => void
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => getStoredUser())
  const queryClient = useQueryClient()

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await authApi.login(payload)
    setAuth(res.token, res.user)
    setUserState(res.user)
    return res.user
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await authApi.register(payload)
    setAuth(res.token, res.user)
    setUserState(res.user)
    return res.user
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUserState(null)
    queryClient.clear()
  }, [queryClient])

  const setUser = useCallback((u: User) => {
    setStoredUser(u)
    setUserState(u)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isDoctor: user?.role === 'doctor',
      login,
      register,
      logout,
      setUser,
    }),
    [user, login, register, logout, setUser],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
