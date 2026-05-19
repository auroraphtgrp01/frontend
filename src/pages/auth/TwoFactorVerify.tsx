import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useValidate2FA } from '@/api/auth'
import { getUser } from '@/lib/axios'
import { defaultPathAfterTenantAuth } from '@/lib/post-auth-redirect'
import { toast } from 'sonner'

// ---------- Schema ----------

const verifySchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be at least 6 digits')
    .max(8, 'Code must be at most 8 digits')
    .regex(/^\d+$/, 'Code must contain only numbers'),
})

type VerifyFormData = z.infer<typeof verifySchema>

// ---------- Component ----------

export default function TwoFactorVerifyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const twofaToken = searchParams.get('token') || ''
  const redirectRaw = searchParams.get('redirect')
  const redirectParam =
    redirectRaw && redirectRaw.trim() !== '' ? redirectRaw.trim() : null

  const validateMutation = useValidate2FA()

  const form = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: '' },
  })

  const handleSubmit = async (data: VerifyFormData) => {
    if (!twofaToken) {
      toast.error('Invalid 2FA session. Please login again.')
      navigate('/login')
      return
    }

    try {
      await validateMutation.mutateAsync({
        twofa_token: twofaToken,
        code: data.code,
      })
      toast.success('Verification successful!')
      const stored = getUser() as { role?: string } | null
      window.location.href =
        redirectParam ?? defaultPathAfterTenantAuth(stored?.role ?? undefined)
    } catch {
      toast.error('Invalid code. Please try again.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={() => navigate('/login')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Login
        </Button>

        <Card>
          <CardHeader className="pb-2 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-7 w-7 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="000000"
                  autoComplete="one-time-code"
                  maxLength={8}
                  className="text-center text-2xl tracking-widest font-mono h-14"
                  {...form.register('code')}
                />
                {form.formState.errors.code && (
                  <p className="text-center text-xs text-destructive">
                    {form.formState.errors.code.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={validateMutation.isPending}
              >
                {validateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            </form>

            <div className="mt-4 border-t pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Don't have access to your authenticator app?
              </p>
              <Button variant="link" size="sm" className="mt-1 text-xs">
                Use a backup code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
