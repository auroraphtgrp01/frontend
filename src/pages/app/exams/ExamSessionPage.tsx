import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useExamAttempt } from '@/contexts/ExamAttemptContext'
import { useAttempt, useSubmitSkill, useExamPlayContent, type AttemptRuntime } from '@/api/attempts'
import { ExamSessionWithProvider, ProgressTracker } from '@/components/exam/ExamSession'
import { ListeningPlayer } from '@/components/exam/ListeningPlayer'
import { SubmitConfirmDialog } from '@/components/exam/SubmitConfirmDialog'
import type { CheckpointAnswer, SkillType } from '@/types/exam'

const QUESTION_NAME_PATTERN = /name=["'](q-?[\w-]*)["']/gi

function collectQuestionIdsFromParts(partsHtml: Array<{ html: string }>) {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const part of partsHtml) {
    for (const match of part.html.matchAll(QUESTION_NAME_PATTERN)) {
      const questionId = match[1]
      if (!questionId || seen.has(questionId)) continue
      seen.add(questionId)
      ids.push(questionId)
    }
  }
  return ids.sort((a, b) => {
    const num = (value: string) => {
      const parsed = Number.parseInt(value.replace(/^q-?/i, ''), 10)
      return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
    }
    return num(a) - num(b)
  })
}

function collectCheckpointAnswers(
  partsHtml: Array<{ html: string }>,
  inputValues: Record<string, string>,
): CheckpointAnswer[] {
  return collectQuestionIdsFromParts(partsHtml).map((questionId, index) => ({
    question_id: questionId,
    client_answer_seq: index + 1,
    answer: inputValues[questionId] ?? '',
    updated_at: new Date().toISOString(),
  }))
}

interface SkillExamPageProps {
  attemptId: string
  skillAttemptId?: string
  skillType: SkillType
  examPlayUrl?: string
  audioUrl?: string
  runtime: AttemptRuntime
  onSkillSubmitted?: (skill: SkillType) => void
  selectedPartNumbers?: number[]
}

/** Standalone skill exam page — loads its own playContent given the examPlayUrl.
 *  This is the single point where useExamPlayContent lives so it can re-fire
 *  whenever the active skill changes (e.g. on skill switch). */
function SkillExamPage({
  attemptId,
  skillAttemptId: propSkillAttemptId,
  skillType,
  examPlayUrl,
  audioUrl,
  runtime,
  onSkillSubmitted,
  selectedPartNumbers,
}: SkillExamPageProps) {
  const navigate = useNavigate()
  const { updateAnswer, setCurrentSkill, answers } = useExamAttempt()
  const { data: attempt } = useAttempt(attemptId, { runtime })
  const skillAttemptId = propSkillAttemptId || attempt?.skill_attempt_id || attempt?.skills?.find(s => s.skill_type === skillType)?.id || ''
  const submitMutation = useSubmitSkill()

  // Only load playContent once we have a real URL
  const { data: playContent } = useExamPlayContent(examPlayUrl, { attemptId, skillAttemptId, runtime, audioUrl })

  const partsHtml = playContent?.parts_html ?? []
  const partsToRender = useMemo(() => {
    if (!selectedPartNumbers || selectedPartNumbers.length === 0) return partsHtml
    const selected = new Set(selectedPartNumbers)
    const filtered = partsHtml.filter((part, index) => {
      const partNumber = part.part_index > 0 ? part.part_index : index + 1
      return selected.has(partNumber)
    })
    return filtered.length > 0 ? filtered : partsHtml
  }, [partsHtml, selectedPartNumbers])
  const [currentPartIdx, setCurrentPartIdx] = useState(0)
  const [showSubmit, setShowSubmit] = useState(false)

  const inputValues = useRef<Record<string, string>>({})

  useLayoutEffect(() => {
    if (skillType) setCurrentSkill(skillType)
  }, [skillType, setCurrentSkill])

  useEffect(() => {
    const serverAnswers = attempt?.answers
    if (!serverAnswers) return
    for (const [qId, data] of Object.entries(serverAnswers)) {
      inputValues.current[qId] = String(data.answer ?? '')
    }
  }, [attempt?.answers])

  const handleInputChange = useCallback(
    (name: string, value: string) => {
      inputValues.current[name] = value
      updateAnswer(name, value, skillType)
    },
    [skillType, updateAnswer],
  )

  useEffect(() => {
    if (currentPartIdx >= partsToRender.length) {
      setCurrentPartIdx(0)
    }
  }, [currentPartIdx, partsToRender.length])

  const answeredCount = collectQuestionIdsFromParts(partsToRender)
    .filter((questionId) => (inputValues.current[questionId] ?? '').trim() !== '')
    .length

  const handleSubmit = async () => {
    if (!skillAttemptId) return
    const answersForSkill =
      partsToRender.length > 0
        ? collectCheckpointAnswers(partsToRender, inputValues.current)
        : answers?.[skillType] ?? []
    await submitMutation.mutateAsync({
      attemptId,
      skillAttemptId,
      answers: answersForSkill,
      runtime,
    })
    onSkillSubmitted?.(skillType)
    navigate(runtime === 'practice' ? `/app/practice/results/${attemptId}` : `/app/results/${attemptId}`)
  }

  // Per-part question counts
  const partInfo = partsToRender.map((p, index) => ({
    ...p,
    displayPartNumber: p.part_index > 0 ? p.part_index : index + 1,
    qCount: collectQuestionIdsFromParts([p]).length,
  }))
  const totalQuestions = partInfo.reduce((acc, p) => acc + p.qCount, 0)
  const currentPart = partInfo[currentPartIdx]

  const getListeningAudioUrl = () => audioUrl || playContent?.audio_url

  const readAttribute = (tag: string, attr: string) => {
    const match = tag.match(new RegExp(`${attr}\\s*=\\s*(["'])(.*?)\\1`, 'i'))
    return match?.[2] ?? ''
  }

  const getOptionLabel = (html: string, inputEnd: number, value: string) => {
    const nextHtml = html.slice(inputEnd, inputEnd + 220)
    const labelMatch = nextHtml.match(/^\s*(?:<[^>]+>\s*)*([^<\n]+)/)
    const cleaned = labelMatch?.[1]?.replace(/&nbsp;/g, ' ').trim()
    return cleaned || value
  }

  const escapeHtmlAttribute = (value: string) => value.replace(/"/g, '&quot;')

  const injectInputs = (html: string): string => {
    return html
      .replace(
        /<input\s[^>]*name=["'](q-?[\w-]*)["'][^>]*>/gi,
        (tag: string, name: string, offset: number) => {
          const rawType = readAttribute(tag, 'type').toLowerCase()
          const type = rawType === 'radio' || rawType === 'checkbox' ? rawType : 'text'
          const value = readAttribute(tag, 'value') || name
          const savedValue = inputValues.current[name] ?? ''

          if (type === 'radio') {
            const checked = savedValue === value ? ' checked' : ''
            const label = getOptionLabel(html, offset + tag.length, value)
            return `<label class="exam-option"><input type="radio" name="${name}" value="${escapeHtmlAttribute(value)}" class="exam-input" data-name="${name}"${checked} /><span>${label}</span></label>`
          }

          if (type === 'checkbox') {
            const savedValues = savedValue.split('|').filter(Boolean)
            const checked = savedValues.includes(value) ? ' checked' : ''
            const label = getOptionLabel(html, offset + tag.length, value)
            return `<label class="exam-option"><input type="checkbox" name="${name}" value="${escapeHtmlAttribute(value)}" class="exam-input" data-name="${name}"${checked} /><span>${label}</span></label>`
          }

          return `<input type="text" name="${name}" value="${escapeHtmlAttribute(savedValue)}" placeholder="..." class="exam-input exam-text-input" data-name="${name}" />`
        }
      )
      .replace(
        /<textarea\s([^>]*\s)?name=["'](q-?[\w-]*)["']([^>]*)>([\s\S]*?)<\/textarea>/gi,
        (_tag: string, beforeName: string = '', name: string, afterName: string = '') => {
          const savedValue = inputValues.current[name] ?? ''
          const attrs = `${beforeName || ''}name="${name}"${afterName || ''}`
          const withClass = /class\s*=/.test(attrs)
            ? attrs.replace(/class\s*=\s*(["'])(.*?)\1/i, (_match, quote, classes) => `class=${quote}${classes} exam-input exam-textarea${quote}`)
            : `${attrs} class="exam-input exam-textarea"`
          const withDataName = /data-name\s*=/.test(withClass)
            ? withClass
            : `${withClass} data-name="${name}"`
          return `<textarea ${withDataName}>${escapeHtmlAttribute(savedValue)}</textarea>`
        }
      )
  }

  const attachInputHandlers = (el: HTMLDivElement | null) => {
    if (!el) return
    el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.exam-input').forEach((input) => {
      const name = input.getAttribute('data-name')
      if (!name) return

      if (input instanceof HTMLInputElement && input.type === 'radio') {
        input.checked = inputValues.current[name] === input.value
        input.onchange = () => {
          if (input.checked) handleInputChange(name, input.value)
        }
        return
      }

      if (input instanceof HTMLInputElement && input.type === 'checkbox') {
        const savedValues = inputValues.current[name]?.split('|').filter(Boolean) ?? []
        input.checked = savedValues.includes(input.value)
        input.onchange = () => {
          const selectedValues = Array.from(
            el.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][data-name="${name}"]`),
          )
            .filter((item) => item.checked)
            .map((item) => item.value)
          handleInputChange(name, selectedValues.join('|'))
        }
        return
      }

      input.value = inputValues.current[name] ?? ''
      input.oninput = () => {
        handleInputChange(name, input.value)
      }
    })
  }

  // Show loading while fetching playContent from S3
  if (!playContent) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12 text-gray-500">
          {examPlayUrl ? 'Loading exam content from S3...' : 'No exam play URL available.'}
        </div>
      </div>
    )
  }

  if (partsToRender.length === 0 || partsToRender.every((part) => part.html.trim() === '')) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12 text-gray-500">
          No questions found in this exam content.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 capitalize">{skillType} Exam</h2>
          <p className="text-sm text-gray-500 mt-1">
            {partsToRender.length > 1 && (
              <span className="font-medium text-blue-600 mr-1">Part {currentPart?.displayPartNumber ?? currentPartIdx + 1}</span>
            )}
            {playContent?.title ?? ''}
          </p>
        </div>
        <div className="text-sm text-gray-400">
          {partsToRender.length > 1 && (
            <span className="text-xs mr-3">{currentPartIdx + 1}/{partsToRender.length} parts</span>
          )}
          {totalQuestions} questions
        </div>
      </div>

      {/* Part tabs */}
      {partsToRender.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {partInfo.map((p, tabIdx) => (
            <button
              key={p.part_index}
              onClick={() => setCurrentPartIdx(tabIdx)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tabIdx === currentPartIdx
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Part {p.displayPartNumber}
              <span className="ml-1.5 text-xs opacity-70">{p.qCount}q</span>
            </button>
          ))}
        </div>
      )}

      <div className="h-1.5 bg-gray-200 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, (answeredCount / Math.max(totalQuestions, 1)) * 100)}%` }}
        />
      </div>

      {skillType === 'listening' && (
        <div className="mb-6 space-y-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-medium">Listening audio</p>
            <p className="mt-1 text-blue-800/80">
              Use the player below to listen to the recording before answering the questions in this part.
            </p>
          </div>
          <ListeningPlayer src={getListeningAudioUrl()} />
        </div>
      )}

      {/* Full part HTML with injected interactive inputs */}
      {currentPart && (
        <div
          key={currentPartIdx}
          className="bg-white rounded-xl border shadow-sm p-6 mb-6 prose max-w-none
            [&_p]:my-2 [&_strong]:font-semibold [&_em]:italic
            [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
            [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_td]:border
            [&_th]:bg-gray-100 [&_th]:p-2 [&_td]:p-2
            [&_.exam-text-input]:w-full [&_.exam-text-input]:px-3 [&_.exam-text-input]:py-2
            [&_.exam-text-input]:text-sm [&_.exam-text-input]:border [&_.exam-text-input]:border-gray-300
            [&_.exam-text-input]:rounded-lg [&_.exam-text-input]:focus:outline-none [&_.exam-text-input]:focus:ring-2
            [&_.exam-text-input]:focus:ring-blue-500 [&_.exam-text-input]:inline-block [&_.exam-text-input]:min-w-[120px]
            [&_.exam-textarea]:w-full [&_.exam-textarea]:min-h-40 [&_.exam-textarea]:px-4 [&_.exam-textarea]:py-3
            [&_.exam-textarea]:text-sm [&_.exam-textarea]:border [&_.exam-textarea]:border-gray-300 [&_.exam-textarea]:rounded-lg
            [&_.exam-textarea]:focus:outline-none [&_.exam-textarea]:focus:ring-2 [&_.exam-textarea]:focus:ring-blue-500
            [&_.subjective-question]:space-y-3 [&_.subjective-question]:rounded-lg [&_.subjective-question]:border [&_.subjective-question]:border-gray-100
            [&_.subjective-question]:bg-gray-50 [&_.subjective-question]:p-4 [&_.subjective-part]:mb-4
            [&_.exam-option]:flex [&_.exam-option]:items-start [&_.exam-option]:gap-2 [&_.exam-option]:my-2
            [&_.exam-option_input]:mt-1"
          dangerouslySetInnerHTML={{ __html: injectInputs(currentPart.html) }}
          ref={attachInputHandlers}
        />
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentPartIdx(Math.max(0, currentPartIdx - 1))}
          disabled={currentPartIdx === 0}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous Part
        </button>

        <div className="flex gap-2">
          {currentPartIdx < partsToRender.length - 1 ? (
            <button
              onClick={() => setCurrentPartIdx((p) => p + 1)}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Next Part
            </button>
          ) : (
            <button
              onClick={() => setShowSubmit(true)}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              Submit
            </button>
          )}
        </div>
      </div>

      <SubmitConfirmDialog
        open={showSubmit}
        onOpenChange={setShowSubmit}
        unansweredCount={totalQuestions - answeredCount}
        onConfirm={handleSubmit}
        skillName={skillType}
      />
    </div>
  )
}

// ============================================================
// MultiSkillExamSession
// ============================================================

interface MultiSkillExamSessionProps {
  attemptId: string
  attempt: ReturnType<typeof useAttempt>['data']
  runtime: AttemptRuntime
  onAllSubmitted: () => void
}

const SKILL_ORDER: SkillType[] = ['listening', 'reading', 'writing', 'speaking']

function MultiSkillExamSession({ attemptId, attempt, runtime, onAllSubmitted }: MultiSkillExamSessionProps) {
  const { setCurrentSkill, currentSkill, saveNow } = useExamAttempt()

  const skills = attempt?.skills ?? []
  const orderedSkills = SKILL_ORDER.filter((s) => skills.some((sk) => sk.skill_type === s))
  const initialSkill = currentSkill || orderedSkills[0] || 'listening'
  const [activeSkill, setActiveSkill] = useState<SkillType>(initialSkill)

  useEffect(() => {
    if (currentSkill && currentSkill !== activeSkill) {
      setActiveSkill(currentSkill)
    }
  }, [currentSkill])

  const activeSkillData = skills.find((s) => s.skill_type === activeSkill)
  const audioUrl = activeSkill === 'listening' ? (activeSkillData?.audio_url || undefined) : undefined
  const [searchParams] = useSearchParams()
  const selectedPartNumbers = useMemo(() => {
    const raw = searchParams.get('parts')
    if (!raw) return undefined
    const parsed = raw
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isInteger(value) && value > 0)
    if (parsed.length === 0) return undefined
    return [...new Set(parsed)].sort((a, b) => a - b)
  }, [searchParams])

  const handleSelectSkill = async (skill: SkillType) => {
    await saveNow()
    setActiveSkill(skill)
    setCurrentSkill(skill)
  }

  const handleSkillSubmitted = async (submittedSkill: SkillType) => {
    await saveNow()
    const nextIdx = orderedSkills.indexOf(submittedSkill) + 1
    if (nextIdx < orderedSkills.length) {
      const next = orderedSkills[nextIdx]
      setActiveSkill(next)
      setCurrentSkill(next)
    } else {
      onAllSubmitted()
    }
  }

  return (
    <>
      <div className="sticky top-[73px] z-40 bg-white border-b px-6 py-3">
        <ProgressTracker
          skills={skills.map((s) => ({ skill_type: s.skill_type, status: s.status }))}
          currentSkill={activeSkill}
          onSelectSkill={handleSelectSkill}
        />
      </div>
      <div className="flex-1">
        {/* examPlayUrl changes when activeSkill changes, triggering useExamPlayContent inside */}
        <SkillExamPage
          attemptId={attemptId}
          skillType={activeSkill}
          examPlayUrl={activeSkillData?.exam_play_url}
          audioUrl={audioUrl}
          runtime={runtime}
          onSkillSubmitted={handleSkillSubmitted}
          selectedPartNumbers={selectedPartNumbers}
        />
      </div>
    </>
  )
}

// ============================================================
// ExamSessionPage
// ============================================================

export default function ExamSessionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { attemptId = '' } = useParams<{ attemptId: string }>()
  const runtime: AttemptRuntime = location.pathname.includes('/practice/') ? 'practice' : 'exam'
  const { data: attempt, isLoading, error } = useAttempt(attemptId, { runtime })
  const resultPath = runtime === 'practice'
    ? `/app/practice/results/${attemptId}`
    : `/app/results/${attemptId}`

  const skillAttemptIdFromUrl = searchParams.get('skill_attempt_id') || undefined
  const selectedPartNumbers = useMemo(() => {
    const raw = searchParams.get('parts')
    if (!raw) return undefined
    const parsed = raw
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isInteger(value) && value > 0)
    if (parsed.length === 0) return undefined
    return [...new Set(parsed)].sort((a, b) => a - b)
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-3">Loading exam session...</p>
        </div>
      </div>
    )
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-900 font-semibold">Exam session not found</p>
          <button onClick={() => navigate('/app/exams')} className="text-blue-600 mt-2 underline">
            Back to Exams
          </button>
        </div>
      </div>
    )
  }

  const isMultiSkill = (attempt.skills?.length ?? 0) > 1
  const skillType: SkillType = (attempt.skill as SkillType) || attempt.skills?.[0]?.skill_type || 'reading'
  const activeSkillData = attempt.skills?.find((s) => s.skill_type === skillType)
  const audioUrl = skillType === 'listening' ? (activeSkillData?.audio_url || attempt.audio_url || undefined) : undefined
  const examPlayUrl = activeSkillData?.exam_play_url ?? attempt.exam_play_url

  if (isMultiSkill) {
    return (
      <ExamSessionWithProvider
        attempt={attempt}
        onAllSubmitted={() => navigate(resultPath)}
      >
        <MultiSkillExamSession
          attemptId={attemptId}
          attempt={attempt}
          runtime={runtime}
          onAllSubmitted={() => navigate(resultPath)}
        />
      </ExamSessionWithProvider>
    )
  }

  return (
    <ExamSessionWithProvider
      attempt={attempt}
      onAllSubmitted={() => navigate(resultPath)}
    >
      <SkillExamPage
        attemptId={attemptId}
        skillAttemptId={skillAttemptIdFromUrl}
        skillType={skillType}
        examPlayUrl={examPlayUrl}
        audioUrl={audioUrl}
        runtime={runtime}
        onSkillSubmitted={() => navigate(resultPath)}
        selectedPartNumbers={selectedPartNumbers}
      />
    </ExamSessionWithProvider>
  )
}
