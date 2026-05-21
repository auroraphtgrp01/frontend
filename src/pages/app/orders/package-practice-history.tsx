import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Headphones,
  History,
  Mic,
  PenLine,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { usePracticeHistoryFiltered } from '@/api/entitlements'
import { formatDate } from '@/lib/formatters'
import type { PracticeHistoryItem, PracticeSkill } from '@/types/entitlement'

const ALL_SKILLS = [
  { skill: 'listening' as PracticeSkill, label: 'Listening', icon: Headphones },
  { skill: 'reading' as PracticeSkill, label: 'Reading', icon: BookOpen },
  { skill: 'writing' as PracticeSkill, label: 'Writing', icon: PenLine },
  { skill: 'speaking' as PracticeSkill, label: 'Speaking', icon: Mic },
]

function statusBadge(status: PracticeHistoryItem['status']) {
  if (status === 'in_progress') {
    return <Badge variant="outline" className="text-xs">In Progress</Badge>
  }
  if (status === 'submitted') {
    return <Badge variant="secondary" className="text-xs">Submitted</Badge>
  }
  return <Badge className="text-xs">Graded</Badge>
}

function formatHistoryExamLabel(item: PracticeHistoryItem) {
  const parts: string[] = []
  if (item.exam_title?.trim()) parts.push(item.exam_title.trim())
  if (item.exam_code?.trim()) parts.push(`Đề #${item.exam_code.trim()}`)
  if (parts.length > 0) return parts.join(' · ')
  return `Exam ${item.exam_uuid.slice(0, 8)}`
}

export type PracticeHistorySectionProps = {
  /** Order id for Redo — required to start a new attempt on the same package */
  orderId?: string
  onRedo: (orderId: string, skill: PracticeSkill, examUuid: string) => void
  redoPending: string | null
  startIsPending: boolean
}

export function PracticeHistorySection({
  orderId,
  onRedo,
  redoPending,
  startIsPending,
}: PracticeHistorySectionProps) {
  const [historyStatus, setHistoryStatus] = useState<'all' | 'in_progress' | 'submitted' | 'graded'>('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchText, setSearchText] = useState('')
  const { data: history, isLoading } = usePracticeHistoryFiltered({
    status: historyStatus,
    search: searchText,
  })
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  const toggleSkill = (skill: string) => {
    setExpandedSkills((prev) => {
      const next = new Set(prev)
      if (next.has(skill)) next.delete(skill)
      else next.add(skill)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 space-y-2">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-8 w-full animate-pulse rounded bg-muted" />
      </div>
    )
  }

  const historyItems = Array.isArray(history) ? history : []
  const hasAnyHistory = historyItems.length > 0

  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="h-4 w-4" />
        Practice History
        {!orderId && (
          <span className="text-xs font-normal">(open a package to redo)</span>
        )}
      </div>
      <div className="flex flex-col gap-2 pl-6 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by exam UUID/code..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') setSearchText(searchInput.trim())
          }}
          className="sm:max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={() => setSearchText(searchInput.trim())}>
          Search
        </Button>
        <select
          value={historyStatus}
          onChange={(event) =>
            setHistoryStatus(event.target.value as 'all' | 'in_progress' | 'submitted' | 'graded')
          }
          className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-40"
        >
          <option value="all">All status</option>
          <option value="in_progress">In Progress</option>
          <option value="submitted">Submitted</option>
          <option value="graded">Graded</option>
        </select>
      </div>
      {!hasAnyHistory ? (
        <p className="text-sm text-muted-foreground pl-6">No past attempts yet.</p>
      ) : (
        <div className="space-y-1 pl-6">
          {ALL_SKILLS.map(({ skill, label, icon: Icon }) => {
            const skillItems = historyItems.filter((h) => h.skill === skill)
            if (skillItems.length === 0) return null
            const isOpen = expandedSkills.has(skill)
            return (
              <div key={skill} className="rounded-md border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSkill(skill)}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    <Badge variant="outline" className="text-xs font-normal">
                      {skillItems.length}
                    </Badge>
                  </span>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {isOpen && (
                  <div className="divide-y border-t">
                    {skillItems.map((item) => {
                      const isRedoPending = redoPending === `redo:${orderId}:${skill}:${item.exam_uuid}`
                      return (
                        <div
                          key={item.practice_skill_attempt_id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              {statusBadge(item.status)}
                              <span className="text-muted-foreground">
                                {formatDate(item.started_at, 'datetime')}
                              </span>
                            </div>
                            <p
                              className="truncate text-xs text-muted-foreground"
                              title={formatHistoryExamLabel(item)}
                            >
                              {formatHistoryExamLabel(item)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {item.status === 'in_progress' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate(`/app/practice/session/${item.practice_attempt_id}`)
                                }
                              >
                                Continue
                              </Button>
                            )}
                            {item.can_view_result && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/app/practice/results/${item.practice_attempt_id}`}>
                                  View result
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!orderId || isRedoPending || startIsPending}
                              onClick={() => orderId && onRedo(orderId, item.skill, item.exam_uuid)}
                            >
                              <RefreshCw
                                className={`h-3.5 w-3.5 mr-1 ${isRedoPending ? 'animate-spin' : ''}`}
                              />
                              Redo
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
