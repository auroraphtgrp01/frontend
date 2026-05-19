import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useLogout } from '@/api/auth'
import { useAcademys } from '@/api/academys'
import { AUTH_STORAGE_KEYS } from '@/lib/constants'
import {
  FLOW_LABELS_VI,
  getAppFlow,
  type ShellVariant,
} from '@/lib/app-flow'

function profileHref(
  shellVariant: ShellVariant,
  isSuperAdmin: boolean,
): string {
  if (shellVariant === 'learner') return '/app/profile'
  if (isSuperAdmin) return '/admin/platform-profile'
  return '/admin/staff-profile'
}

interface HeaderProps {
  shellVariant?: ShellVariant
}

export function Header({ shellVariant = 'learner' }: HeaderProps) {
  const { user, academy, isSuperAdmin } = useAuth()
  const logout = useLogout()
  const navigate = useNavigate()
  const { data: academys, isLoading } = useAcademys({
    enabled: isSuperAdmin(),
  })
  const queryClient = useQueryClient()
  const flow = getAppFlow(user?.role)
  const tenantSlug =
    typeof window !== 'undefined'
      ? localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN_ACADEMY_SLUG)?.trim()
      : null

  const handleAcademyChange = (academyId: string) => {
    if (academyId === '__all__') {
      academy.setAcademy(null, null)
    } else {
      const selected = academys?.find((a) => a.id === academyId)
      if (selected) {
        academy.setAcademy(academyId, selected.name)
        queryClient.invalidateQueries({ queryKey: ['users'] })
      }
    }
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        {isSuperAdmin() ? (
          <div className="min-w-[200px] max-w-full">
            {isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                value={academy.academyId || '__all__'}
                onValueChange={handleAcademyChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn academy (tenant)…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tất cả academy</SelectItem>
                  {academys?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : shellVariant !== 'learner' ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {tenantSlug && (
              <Badge variant="secondary">Academy: {tenantSlug}</Badge>
            )}
            {academy.academyName && (
              <Badge variant="outline">{academy.academyName}</Badge>
            )}
          </div>
        ) : null}
        <Badge
          variant="default"
          className="max-w-full whitespace-normal text-left font-normal leading-snug"
        >
          {FLOW_LABELS_VI[flow]}
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start md:flex">
                <span className="text-sm font-medium">{user?.name}</span>
                <Badge variant="outline" className="text-xs">
                  {user?.role}
                </Badge>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                navigate(profileHref(shellVariant, isSuperAdmin()))
              }
            >
              <UserIcon className="mr-2 h-4 w-4" />
              {isSuperAdmin() ? 'Profile (global)' : 'Profile'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout.mutate()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
