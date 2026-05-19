import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useGlobalPlatformMe } from '@/api/auth'
import { FLOW_LABELS_VI, getAppFlow } from '@/lib/app-flow'
import { useAuth } from '@/contexts/AuthContext'

export default function PlatformProfilePage() {
  const { user } = useAuth()
  const { data, isLoading, isError } = useGlobalPlatformMe()
  const flow = getAppFlow(user?.role)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile — Global</h1>
        <p className="text-sm text-muted-foreground">
          Tài khoản system_admin trên control plane (không gắn một academy đơn lẻ).
        </p>
        <Badge variant="outline" className="mt-2">
          {FLOW_LABELS_VI[flow]}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin từ API</CardTitle>
          <CardDescription>GET /api/v1/global/users/me</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {isError && (
            <p className="text-sm text-destructive">Không tải được profile global.</p>
          )}
          {!isLoading && data != null && (
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
