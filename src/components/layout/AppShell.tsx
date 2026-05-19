import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ShellVariant } from '@/lib/app-flow'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface AppShellProps {
  children: React.ReactNode
  /** Visual / IA separation between learner vs platform vs academy staff vs teacher */
  variant?: ShellVariant
}

const shellAccent: Record<ShellVariant, string> = {
  learner: 'border-t-transparent',
  platform: 'border-t-violet-600 bg-violet-50/30 dark:bg-violet-950/20',
  academy_staff: 'border-t-blue-600 bg-blue-50/25 dark:bg-blue-950/15',
  teacher: 'border-t-emerald-600 bg-emerald-50/25 dark:bg-emerald-950/15',
}

export function AppShell({ children, variant = 'learner' }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div
      className={cn(
        'flex h-screen overflow-hidden border-t-4 bg-background transition-colors',
        shellAccent[variant],
      )}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header shellVariant={variant} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
