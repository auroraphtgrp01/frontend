import { useNavigate } from 'react-router-dom'
import { useTrialEligibility, useStartTrial, useTrialSessions, useTrialResults, type TrialSkill } from '@/api/trialExam'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, BookOpen, Headphones, PenTool, Mic, Lock, Play, Clock, CheckCircle, ChevronRight } from 'lucide-react'

const SKILL_META: Record<TrialSkill, { label: string; icon: React.ReactNode; description: string; color: string }> = {
  reading: {
    label: 'Reading',
    icon: <BookOpen className="h-7 w-7" />,
    description: '60 minutes — 40 questions',
    color: 'bg-blue-100 text-blue-700',
  },
  listening: {
    label: 'Listening',
    icon: <Headphones className="h-7 w-7" />,
    description: '45 minutes — 40 questions',
    color: 'bg-purple-100 text-purple-700',
  },
  writing: {
    label: 'Writing',
    icon: <PenTool className="h-7 w-7" />,
    description: '60 minutes — 2 tasks',
    color: 'bg-green-100 text-green-700',
  },
  speaking: {
    label: 'Speaking',
    icon: <Mic className="h-7 w-7" />,
    description: '11–14 minutes — 3 parts',
    color: 'bg-orange-100 text-orange-700',
  },
}

const SKILL_ORDER: TrialSkill[] = ['reading', 'listening', 'writing', 'speaking']

interface SkillState {
  session: {
    id: string
    skill: TrialSkill
    status: string
    expires_at: string
    submitted_at?: string
  } | null
  result: {
    id: string
    skill: TrialSkill
    grading_status: string
    visible_to_student: boolean
    band_score: number | null
  } | null
}

function SkillCard({
  skill,
  state,
  eligible,
  onStart,
  isStarting,
}: {
  skill: TrialSkill
  state: SkillState
  eligible: boolean
  onStart: () => void
  isStarting: boolean
}) {
  const meta = SKILL_META[skill]
  const isInProgress = state.session?.status === 'in_progress'
  const hasResult = state.result?.visible_to_student && state.result.band_score !== null

  return (
    <Card className={hasResult ? 'border-green-200 bg-green-50/30' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className={`rounded-lg p-2.5 ${meta.color}`}>
            {meta.icon}
          </div>
          <div className="flex flex-col items-end gap-1">
            {isInProgress && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 whitespace-nowrap">
                <Clock className="h-3 w-3 mr-1" />
                In Progress
              </Badge>
            )}
            {hasResult && (
              <Badge className="bg-green-100 text-green-800 border-green-200 whitespace-nowrap">
                <CheckCircle className="h-3 w-3 mr-1" />
                Band {state.result!.band_score!.toFixed(1)}
              </Badge>
            )}
            {!isInProgress && !hasResult && state.session?.status === 'submitted' && (
              <Badge variant="secondary" className="whitespace-nowrap">
                Submitted
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="mt-2 text-lg">{meta.label}</CardTitle>
        <CardDescription className="text-xs">{meta.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isInProgress ? (
          <Button onClick={onStart} className="w-full gap-2 bg-amber-600 hover:bg-amber-700">
            <Play className="h-4 w-4" />
            Continue
          </Button>
        ) : hasResult ? (
          <Button variant="outline" onClick={onStart} className="w-full gap-2">
            Review
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : eligible && !state.session ? (
          <Button onClick={onStart} disabled={isStarting} className="w-full gap-2">
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {isStarting ? 'Starting...' : 'Start Trial'}
          </Button>
        ) : (
          <Button disabled className="w-full gap-2" variant="secondary">
            <Lock className="h-4 w-4" />
            {state.session?.status === 'submitted' ? 'Pending Review' : 'Completed'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function TrialExamPage() {
  const navigate = useNavigate()
  const { data: eligibility, isLoading: eligibilityLoading } = useTrialEligibility()
  const { data: sessions, isLoading: sessionsLoading } = useTrialSessions()
  const { data: results } = useTrialResults()
  const startMutation = useStartTrial()

  const loading = eligibilityLoading || sessionsLoading

  const handleStart = async (skill: TrialSkill, existingSessionId?: string) => {
    try {
      if (existingSessionId) {
        navigate(`/app/trial/exam/${existingSessionId}`)
        return
      }
      const session = await startMutation.mutateAsync({ skill })
      navigate(`/app/trial/exam/${session.id}`)
    } catch {
      // error handled by mutation
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-2 gap-4 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  // New user: no eligible_skills AND no used_skills → all 4 skills are available.
  const isNewUser = (eligibility?.eligible_skills?.length ?? 0) === 0 && (eligibility?.used_skills?.length ?? 0) === 0

  const eligibleSet = new Set(eligibility?.eligible_skills ?? [])
  const usedSet = new Set(eligibility?.used_skills ?? [])

  // Build skill state map
  const sessionBySkill = new Map<TrialSkill, NonNullable<SkillState['session']>>()
  for (const s of sessions ?? []) {
    sessionBySkill.set(s.skill, s)
  }

  const resultBySkill = new Map<TrialSkill, NonNullable<SkillState['result']>>()
  for (const r of results ?? []) {
    resultBySkill.set(r.skill, r)
  }

  const inProgressSession = sessions?.find((s) => s.status === 'in_progress')

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Trial Exam</h1>
        <p className="text-muted-foreground mt-1">
          Free IELTS practice test. Each skill can be attempted once.
        </p>
      </div>

      {/* In-progress banner */}
      {inProgressSession && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            You have a <strong>{SKILL_META[inProgressSession.skill]?.label}</strong> exam in progress.{' '}
            <button
              onClick={() => navigate(`/app/trial/exam/${inProgressSession.id}`)}
              className="underline font-medium hover:no-underline"
            >
              Continue now
            </button>
          </p>
        </div>
      )}

      {/* Skill cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SKILL_ORDER.map((skill) => {
          const session = sessionBySkill.get(skill) ?? null
          const result = resultBySkill.get(skill) ?? null
          const eligible = (eligibleSet.has(skill) && !usedSet.has(skill) && !session) || (isNewUser && !session)

          return (
            <SkillCard
              key={skill}
              skill={skill}
              state={{ session, result }}
              eligible={eligible}
              onStart={() => handleStart(skill, session?.id)}
              isStarting={startMutation.isPending && startMutation.variables?.skill === skill}
            />
          )
        })}
      </div>

      {/* Past results history */}
      {results && results.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">
            Past Results
          </h2>
          <div className="space-y-2">
            {results.slice(0, 10).map((r) => {
              const meta = SKILL_META[r.skill]
              if (!meta) return null
              return (
                <button
                  key={r.id}
                  onClick={() => navigate(`/app/trial/exam/${r.session_id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={`rounded-lg p-2 shrink-0 ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.visible_to_student && r.band_score !== null ? (
                      <span className="text-lg font-bold text-green-600">
                        {r.band_score.toFixed(1)}
                      </span>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Pending
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>How it works:</strong>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li><strong>Reading &amp; Listening:</strong> Instant results after submission.</li>
          <li><strong>Writing:</strong> AI grades first, teacher reviews before you see the score.</li>
          <li><strong>Speaking:</strong> Teacher grades your recording. Results after review.</li>
        </ul>
      </div>
    </div>
  )
}
