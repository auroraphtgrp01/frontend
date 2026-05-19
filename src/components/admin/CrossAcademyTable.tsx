import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { useAcademyStats, type AcademyStats } from '@/api/analytics'
import { ArrowUpDown, Download, Search, ChevronDown, ChevronRight } from 'lucide-react'

interface CrossAcademyTableProps {
  showExport?: boolean
  onExport?: () => void
  compact?: boolean
  /** When false, skips cross-academy stats fetch (e.g. tenant staff). */
  enabled?: boolean
}

type SortKey = 'name' | 'users' | 'exams' | 'orders' | 'revenue'
type SortOrder = 'asc' | 'desc'

export function CrossAcademyTable({
  showExport = false,
  onExport,
  compact = false,
  enabled = true,
}: CrossAcademyTableProps) {
  const { data: academies, isLoading } = useAcademyStats(undefined, { enabled })
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('revenue')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }

  const filteredAcademies = (academies || []).filter(
    (academy: AcademyStats) =>
      academy.academy_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      academy.academy_slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedAcademies = [...filteredAcademies].sort((a, b) => {
    let aVal: string | number
    let bVal: string | number

    switch (sortKey) {
      case 'name':
        aVal = a.academy_name
        bVal = b.academy_name
        break
      case 'users':
        aVal = a.total_users
        bVal = b.total_users
        break
      case 'exams':
        aVal = a.total_exams
        bVal = b.total_exams
        break
      case 'orders':
        aVal = a.total_orders
        bVal = b.total_orders
        break
      case 'revenue':
        aVal = a.total_revenue
        bVal = b.total_revenue
        break
      default:
        return 0
    }

    if (typeof aVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
    }
    return sortOrder === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal
  })

  const SortButton = ({ column }: { column: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(column)}
      className="-ml-3 h-8 data-[state=open]:bg-accent"
    >
      <ArrowUpDown className="mr-2 h-4 w-4" />
      {sortKey === column && (
        <span className="sr-only">
          {sortOrder === 'asc' ? 'Sorted ascending' : 'Sorted descending'}
        </span>
      )}
    </Button>
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Cross-Academy Comparison</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className={compact ? 'pb-3' : undefined}>
        <div className="flex items-center justify-between">
          <CardTitle className={compact ? 'text-base' : undefined}>
            {compact ? 'Academy Performance' : 'Cross-Academy Comparison'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {showExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>
        {!compact && (
          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search academies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className={compact ? 'p-0' : undefined}>
        {!compact && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Academy
                      <SortButton column="name" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      Users
                      <SortButton column="users" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      Exams
                      <SortButton column="exams" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      Orders
                      <SortButton column="orders" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      Revenue
                      <SortButton column="revenue" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAcademies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No academies found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAcademies.map((academy) => (
                    <>
                      <TableRow
                        key={academy.academy_id}
                        className="cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === academy.academy_id ? null : academy.academy_id)}
                      >
                        <TableCell>
                          {expandedRow === academy.academy_id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{academy.academy_name}</span>
                            <span className="text-xs text-muted-foreground">{academy.academy_slug}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span>{academy.total_users}</span>
                            <span className="text-xs text-muted-foreground">{academy.active_users} active</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{academy.total_exams}</TableCell>
                        <TableCell className="text-right">{academy.total_orders}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${academy.total_revenue.toLocaleString()}
                        </TableCell>
                      </TableRow>
                      {expandedRow === academy.academy_id && (
                        <TableRow key={`${academy.academy_id}-expanded`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Total Users</p>
                                <p className="text-lg font-semibold">{academy.total_users}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Active Users</p>
                                <p className="text-lg font-semibold">{academy.active_users}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Pending Gradings</p>
                                <p className="text-lg font-semibold">{academy.pending_gradings}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total Revenue</p>
                                <p className="text-lg font-semibold">
                                  ${academy.total_revenue.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {compact && (
          <div className="divide-y">
            {sortedAcademies.slice(0, 5).map((academy) => (
              <div
                key={academy.academy_id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div>
                  <p className="font-medium">{academy.academy_name}</p>
                  <p className="text-xs text-muted-foreground">{academy.total_users} users</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${academy.total_revenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{academy.total_exams} exams</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
