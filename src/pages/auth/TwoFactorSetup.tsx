import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle, Copy, Download, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEnable2FA, useVerify2FA } from '@/api/auth'
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

// ---------- Steps ----------

type Step = 'intro' | 'scan' | 'verify' | 'backup'

// ---------- Component ----------

export default function TwoFactorSetupPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('intro')
  const [secret, setSecret] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  const enableMutation = useEnable2FA()
  const verifyMutation = useVerify2FA()

  const form = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: '' },
  })

  // Step 1: Start 2FA setup
  const handleStartSetup = async () => {
    try {
      const data = await enableMutation.mutateAsync()
      setSecret(data.secret)
      setStep('scan')
    } catch {
      toast.error('Failed to enable 2FA. Please try again.')
    }
  }

  // Step 2: Verify code
  const handleVerify = async (data: VerifyFormData) => {
    try {
      const result = await verifyMutation.mutateAsync(data.code)
      setBackupCodes(result.backup_codes || [])
      setStep('backup')
    } catch {
      toast.error('Invalid code. Please try again.')
    }
  }

  // Copy secret
  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    toast.success('Secret copied to clipboard')
  }

  // Copy backup code
  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    toast.success('Backup codes copied')
  }

  // Download backup codes
  const downloadBackupCodes = () => {
    const content = `IMTO 2FA Backup Codes\n\nSave these codes in a secure place.\nEach code can only be used once.\n\n${backupCodes.join('\n')}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'imto-2fa-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Render QR code from provisioning URI
  const renderQR = () => {
    // Extract otpauth URI and show as image
    // In production, use a QR library like qrcode.react
    return (
      <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-lg bg-muted text-center">
        <p className="text-xs text-muted-foreground">
          Scan this QR with<br />your authenticator app
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-xl">Set Up Two-Factor Authentication</CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step: Intro */}
            {step === 'intro' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 p-4 text-sm">
                  <p className="font-medium text-blue-900">Why enable 2FA?</p>
                  <ul className="mt-2 space-y-1 text-blue-700">
                    <li>• Protects your account from unauthorized access</li>
                    <li>• Required by your organization's security policy</li>
                    <li>• Works with any TOTP app (Google Authenticator, Authy, etc.)</li>
                  </ul>
                </div>

                <Button onClick={handleStartSetup} className="w-full" disabled={enableMutation.isPending}>
                  {enableMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    'Get Started'
                  )}
                </Button>
              </div>
            )}

            {/* Step: Scan QR */}
            {step === 'scan' && (
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  Scan this QR code with your authenticator app:
                </p>

                {renderQR()}

                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">Manual entry code:</p>
                    <Button variant="ghost" size="sm" className="h-auto p-1" onClick={copySecret}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs">{secret}</p>
                </div>

                <Button onClick={() => setStep('verify')} className="w-full">
                  I've scanned the QR code
                </Button>
              </div>
            )}

            {/* Step: Verify */}
            {step === 'verify' && (
              <form onSubmit={form.handleSubmit(handleVerify)} className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app:
                </p>

                <div className="space-y-2">
                  <Input
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

                <Button type="submit" className="w-full" disabled={verifyMutation.isPending}>
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </form>
            )}

            {/* Step: Backup Codes */}
            {step === 'backup' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="font-medium text-green-700">2FA Enabled Successfully!</p>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <p className="text-sm font-medium text-amber-800">
                    Save your backup codes
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    These codes can be used to access your account if you lose your authenticator device.
                    Each code can only be used once.
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {backupCodes.map((code, i) => (
                      <div
                        key={i}
                        className="rounded bg-white px-2 py-1 font-mono text-sm text-amber-900"
                      >
                        {code}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={copyBackupCodes}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={downloadBackupCodes}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </Button>
                  </div>
                </div>

                <Button onClick={() => navigate('/app/dashboard')} className="w-full">
                  Continue to Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
