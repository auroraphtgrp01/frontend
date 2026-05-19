import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useLogin, useRegister } from '@/api/auth'
import { useVoucherInput } from '@/api/vouchers'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { getUser } from '@/lib/axios'
import { defaultPathAfterTenantAuth } from '@/lib/post-auth-redirect'
import { academyLoginDefaultValues, academyLoginPresets } from '@/lib/dev-login-defaults'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ---------- Schemas ----------

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

// ---------- Component ----------

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const redirectRaw = searchParams.get('redirect')
  const redirectParam =
    redirectRaw && redirectRaw.trim() !== '' ? redirectRaw.trim() : null

  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  const devPresets = useMemo(() => academyLoginPresets(), [])
  const [devPresetId, setDevPresetId] = useState(() => devPresets[0]?.id ?? '')

  const { login, register: registerAuth } = useAuth()
  const loginMutation = useLogin()
  const registerMutation = useRegister()

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: academyLoginDefaultValues(),
  })

  const registerForm = useForm<LoginFormData & { name: string; voucher_code?: string }>({
    resolver: zodResolver(
      loginSchema.extend({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        voucher_code: z.string().optional(),
      }),
    ),
    defaultValues: { email: '', password: '', name: '', voucher_code: '' },
  })

  const handleLogin = async (data: LoginFormData) => {
    try {
      const response = await login(data)

      if (response.requires_2fa && response.twofa_token) {
        // Redirect to 2FA verification
        const q = redirectParam
          ? `&redirect=${encodeURIComponent(redirectParam)}`
          : ''
        window.location.href = `/auth/2fa/verify?token=${encodeURIComponent(response.twofa_token)}${q}`
        return
      }

      if (response.action === 'redirect' && response.redirect_url) {
        toast.success(
          response.academy_name
            ? `Continuing to ${response.academy_name}…`
            : 'Redirecting…',
        )
        window.location.href = response.redirect_url
        return
      }

      if (!response.tokens && !response.access_token) {
        toast.error('Login succeeded but no session was returned. Try again.')
        return
      }

      toast.success(`Welcome back!`)
      // Role comes from JWT merge in setTokens, not from login JSON body
      const role = (getUser() as { role?: string } | null)?.role
      window.location.href =
        redirectParam ?? defaultPathAfterTenantAuth(role ?? response.user?.role)
    } catch {
      toast.error('Login failed. Please check your credentials.')
    }
  }

  const handleRegister = async (data: LoginFormData & { name: string; voucher_code?: string }) => {
    try {
      const response = await registerAuth({
        name: data.name,
        email: data.email,
        password: data.password,
        ...(data.voucher_code ? { voucher_code: data.voucher_code } : {}),
      })

      if (response.requires_2fa && response.twofa_token) {
        const q = redirectParam
          ? `&redirect=${encodeURIComponent(redirectParam)}`
          : ''
        window.location.href = `/auth/2fa/verify?token=${encodeURIComponent(response.twofa_token)}${q}`
        return
      }

      if (!response.tokens && !response.access_token) {
        toast.error('Registration succeeded but no session was returned. Try again.')
        return
      }

      toast.success('Account created successfully!')
      const role = (getUser() as { role?: string } | null)?.role
      window.location.href =
        redirectParam ?? defaultPathAfterTenantAuth(role ?? response.user?.role)
    } catch {
      toast.error('Registration failed. Please try again.')
    }
  }

  const isSubmitting = loginMutation.isPending || registerMutation.isPending

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">imto</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            IELTS Mock Test Platform
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Welcome back</CardTitle>
                <CardDescription>Sign in to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={loginForm.handleSubmit(handleLogin)}
                  className="space-y-4"
                >
                  {import.meta.env.DEV && devPresets.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="dev-login-preset">
                        Tài khoản mặc định (dev)
                      </Label>
                      <Select
                        value={devPresetId}
                        onValueChange={(id) => {
                          setDevPresetId(id)
                          const p = devPresets.find((x) => x.id === id)
                          if (p) {
                            loginForm.setValue('email', p.email, {
                              shouldValidate: true,
                            })
                            loginForm.setValue('password', p.password, {
                              shouldValidate: true,
                            })
                          }
                        }}
                      >
                        <SelectTrigger id="dev-login-preset" className="w-full">
                          <SelectValue placeholder="Chọn tài khoản" />
                        </SelectTrigger>
                        <SelectContent>
                          {devPresets.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Bootstrap center-a — đổi nhanh Quản trị / Giáo viên / Học viên.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...loginForm.register('email')}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-destructive">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        asChild
                      >
                        <Link to="/auth/forgot-password">
                          Forgot password?
                        </Link>
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        {...loginForm.register('password')}
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
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>

                {/* Google OAuth */}
                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => {
                      window.location.href = '/api/v1/auth/google'
                    }}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </Button>
                </div>

                {/* Admin Link */}
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Admin?{' '}
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                    <Link to="/admin/login">Sign in as Admin</Link>
                  </Button>
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Create account</CardTitle>
                <CardDescription>
                  Join and start practicing for IELTS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={registerForm.handleSubmit(handleRegister)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Full Name</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Nguyen Van A"
                      autoComplete="name"
                      {...registerForm.register('name')}
                    />
                    {registerForm.formState.errors.name && (
                      <p className="text-xs text-destructive">
                        {registerForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...registerForm.register('email')}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-xs text-destructive">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      {...registerForm.register('password')}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-xs text-destructive">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <VoucherCodeInput
                    onValid={(code) => {
                      registerForm.setValue('voucher_code', code, { shouldValidate: true })
                    }}
                    onRemove={() => {
                      registerForm.setValue('voucher_code', '', { shouldValidate: true })
                    }}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                  By creating an account, you agree to our{' '}
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                    Terms of Service
                  </Button>{' '}
                  and{' '}
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                    Privacy Policy
                  </Button>
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// VoucherCodeInput allows users to enter an optional voucher code during registration.
// It validates the code against the order-service and reports success/error inline.
function VoucherCodeInput({
  onValid,
  onRemove,
}: {
  onValid: (code: string) => void
  onRemove: () => void
}) {
  const [inputCode, setInputCode] = useState('')
  const { applyVoucher, removeVoucher, isValid, isValidating, error } = useVoucherInput()

  // Notify parent when voucher becomes valid (detect transition false -> true)
  const wasValid = useRef(false)
  useEffect(() => {
    if (isValid && !wasValid.current) {
      onValid(inputCode.trim())
    }
    wasValid.current = isValid
  }, [isValid, inputCode, onValid])

  const handleApply = async () => {
    if (!inputCode.trim()) return
    await applyVoucher(inputCode, 0, 'retail')
  }

  const handleRemove = () => {
    removeVoucher()
    setInputCode('')
    onRemove()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleApply()
    }
  }

  if (isValid) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-green-800">
              {inputCode.toUpperCase()}
            </span>
            <span className="text-xs text-green-600">Voucher applied</span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-green-700 hover:text-green-900"
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Have a voucher code? (optional)"
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          disabled={isValidating}
          className="flex-1 font-mono uppercase"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleApply}
          disabled={isValidating || !inputCode.trim()}
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Apply'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
