import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLES, ROUTES } from '@/lib/constants'
import { defaultPathAfterTenantAuth } from '@/lib/post-auth-redirect'
import { Skeleton } from '@/components/ui/skeleton'

// ---------- Types ----------

/** JWT `role` claim (see `ROLES` in constants). */
type UserRole = string

// ---------- Props ----------

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requireAcademy?: boolean
  fallbackPath?: string
}

// ---------- Component ----------

export function ProtectedRoute({
  children,
  allowedRoles,
  requireAcademy = false,
  fallbackPath,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, academy, isSuperAdmin } = useAuth()
  const location = useLocation()

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="w-full max-w-md space-y-4 p-6">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    )
  }

  // ---- Not authenticated ----
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    )
  }

  // ---- Role check ----
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role || ''
    const hasAllowedRole = allowedRoles.includes(userRole as UserRole)

    if (!hasAllowedRole) {
      // Redirect based on role
      if (fallbackPath) {
        return <Navigate to={fallbackPath} replace />
      }

      if (isSuperAdmin()) {
        return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />
      }

      return <Navigate to={ROUTES.APP_DASHBOARD} replace />
    }
  }

  // ---- Academy check ----
  if (requireAcademy && !academy.academyId && !isSuperAdmin()) {
    // system_admin doesn't need academy context
    return <>{children}</>
  }

  return <>{children}</>
}

// ---------- Admin Route (system_admin or academy_admin) ----------

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, isSuperAdmin } = useAuth()

  if (!isAdmin() && !isSuperAdmin()) {
    return <Navigate to={ROUTES.APP_DASHBOARD} replace />
  }

  return <>{children}</>
}

// ---------- Academy admin only (orders, scheduling; excludes system_admin) ----------

interface AcademyAdminRouteProps {
  children: React.ReactNode
}

export function AcademyAdminRoute({ children }: AcademyAdminRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    )
  }

  if (user?.role !== ROLES.ACADEMY_ADMIN) {
    if (user?.role === ROLES.SYSTEM_ADMIN) {
      return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />
    }
    return <Navigate to={ROUTES.APP_DASHBOARD} replace />
  }

  return <>{children}</>
}

// ---------- Teacher Route (grading-capable roles) ----------

interface TeacherRouteProps {
  children: React.ReactNode
}

export function TeacherRoute({ children }: TeacherRouteProps) {
  const { canGrade } = useAuth()

  if (!canGrade()) {
    return <Navigate to={ROUTES.APP_DASHBOARD} replace />
  }

  return <>{children}</>
}

// ---------- Guest Route (only for unauthenticated users) ----------

interface GuestRouteProps {
  children: React.ReactNode
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading, isSuperAdmin, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    )
  }

  if (isAuthenticated) {
    const redirect = new URLSearchParams(location.search).get('redirect')
    const home = isSuperAdmin() ? '/admin' : defaultPathAfterTenantAuth(user?.role)
    return <Navigate to={redirect || home} replace />
  }

  return <>{children}</>
}

// ---------- SuperAdmin Route (system_admin only) ----------

interface SuperAdminRouteProps {
  children: React.ReactNode
}

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { isSuperAdmin, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    )
  }

  if (!isSuperAdmin()) {
    return <Navigate to={ROUTES.APP_DASHBOARD} replace />
  }

  return <>{children}</>
}
