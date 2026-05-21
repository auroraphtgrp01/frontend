import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  ShoppingCart,
  Calendar,
  User,
  UserCircle,
  ChevronLeft,
  Menu,
  ClipboardCheck,
  GraduationCap,
  Clock,
  Package,
  ScrollText,
  PenTool,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useAuth } from '@/contexts/AuthContext'
import { FLOW_LABELS_VI, getAppFlow } from '@/lib/app-flow'
import { ROLES } from '@/lib/constants'

// ---------- Nav items by role (JWT `role` claim) ----------

const navItemsByRole: Record<
  string,
  { label: string; href: string; icon: typeof LayoutDashboard }[]
> = {
  [ROLES.SYSTEM_ADMIN]: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Tenants', href: '/admin/tenants', icon: BookOpen },
    { label: 'Users', href: '/admin/users', icon: User },
    { label: 'Analytics', href: '/admin/analytics', icon: GraduationCap },
    { label: 'Exam bank', href: '/admin/exams', icon: ScrollText },
    { label: 'Migration jobs', href: '/admin/exam-migrations', icon: ScrollText },
    {
      label: 'Profile (global)',
      href: '/admin/platform-profile',
      icon: UserCircle,
    },
  ],
  [ROLES.ACADEMY_ADMIN]: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/admin/users', icon: User },
    { label: 'DS ĐK Lẻ', href: '/admin/retail-registrations', icon: ClipboardList },
    { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { label: 'Scheduling', href: '/admin/scheduling/timeslots', icon: Clock },
    { label: 'Grading', href: '/admin/grading', icon: ClipboardCheck },
    { label: 'My profile', href: '/admin/staff-profile', icon: UserCircle },
  ],
  [ROLES.TEACHER]: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Grading', href: '/admin/grading', icon: ClipboardCheck },
    { label: 'My profile', href: '/admin/staff-profile', icon: UserCircle },
  ],
  [ROLES.USER]: [
    { label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Thi thử IELTS', href: '/app/trial', icon: PenTool },
    { label: 'Gói luyện tập', href: '/app/products', icon: Package },
    { label: 'Đăng ký lẻ', href: '/app/register', icon: Calendar },
    { label: 'DS ĐK Lẻ', href: '/app/retail-registrations', icon: ClipboardList },
    { label: 'My Orders', href: '/app/orders', icon: ShoppingCart },
    { label: 'Gói đã mua', href: '/app/packages', icon: Package },
    { label: 'Lịch thi đã đăng ký', href: '/app/appointments', icon: Calendar },
    { label: 'Profile', href: '/app/profile', icon: User },
  ],
}

function navKeyForApiRole(role: string | undefined): string {
  if (!role) return ROLES.USER
  const r = role.trim()
  if (r in navItemsByRole) return r
  return ROLES.USER
}

// ---------- Props ----------

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// ---------- Component ----------

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const { user } = useAuth()

  const role = user?.role || ROLES.USER
  const navItems = navItemsByRole[navKeyForApiRole(role)] ?? navItemsByRole[ROLES.USER]
  const flowLabel = FLOW_LABELS_VI[getAppFlow(role)]

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'relative flex h-screen flex-col border-r bg-card transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Logo */}
        <div className="flex min-h-14 flex-col justify-center border-b px-4 py-2">
          {!collapsed && (
            <>
              <span className="text-lg font-bold text-primary">imto</span>
              <span className="line-clamp-2 text-[10px] font-medium leading-tight text-muted-foreground">
                {flowLabel}
              </span>
            </>
          )}
          {collapsed && <span className="text-lg font-bold text-primary">iM</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href))
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      collapsed && 'justify-center px-2',
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
              </Tooltip>
            )
          })}
        </nav>

        {/* Collapse button */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn('w-full', collapsed && 'px-2')}
          >
            {collapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Collapse
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
