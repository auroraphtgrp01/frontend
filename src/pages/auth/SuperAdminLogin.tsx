import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useSuperAdminLogin } from '@/api/auth'
import { toast } from 'sonner'
import { superAdminLoginDefaultValues } from '@/lib/dev-login-defaults'

// ---------- Schema ----------

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

// ---------- Component ----------

export default function SuperAdminLoginPage() {
  const [searchParams] = useSearchParams()
  const redirectRaw = searchParams.get('redirect')
  const redirect =
    redirectRaw && redirectRaw.trim() !== ''
      ? redirectRaw.trim()
      : '/admin/dashboard'

  const [showPassword, setShowPassword] = useState(false)

  const { loginSuperAdmin } = useAuth()
  const loginMutation = useSuperAdminLogin()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: superAdminLoginDefaultValues(),
  })

  const handleSubmit = async (data: LoginFormData) => {
    try {
      await loginSuperAdmin(data)
      toast.success('Welcome, Admin!')
      window.location.href = redirect
    } catch {
      toast.error('Login failed. Please check your credentials.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-primary">imto Admin Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform administration portal
          </p>
        </div>

        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Admin Sign In</CardTitle>
            <CardDescription>
              Access the system admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@imto.vn"
                  autoComplete="email"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In as Admin'
                )}
              </Button>
            </form>

            <div className="mt-4 border-t pt-4">
              <p className="text-center text-xs text-muted-foreground">
                Regular user?{' '}
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                  <Link to="/login">Sign in here</Link>
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Protected by JWT authentication + RBAC
        </p>
      </div>
    </div>
  )
}
