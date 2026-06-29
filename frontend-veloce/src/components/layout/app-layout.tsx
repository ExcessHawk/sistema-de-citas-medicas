import { Outlet } from 'react-router-dom'
import { Navbar } from './navbar'

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Sistema de Citas Médicas · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
