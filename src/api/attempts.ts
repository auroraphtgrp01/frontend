import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { unwrapApiData } from '@/lib/api-envelope'
import type { ExamAttempt, ExamResult, Checkpoint, CheckpointAnswer } from '@/types/exam'
import { toast } from 'sonner'

export type AttemptRuntime = 'exam' | 'practice'

export function attemptBasePath(runtime: AttemptRuntime) {
  return runtime === 'practice' ? '/api/v1/practice/attempts' : '/api/v1/attempts'
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`
}

function hashStablePayload(value: unknown): string {
  const text = stableStringify(value)
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function createAttemptMutationKey(
  action: 'autosave' | 'submit',
  attemptId: string,
  skillAttemptId: string,
  dirty: Array<{ question_id: string; client_answer_seq: number; answer: unknown }>,
) {
  const signature = hashStablePayload(dirty)
  return `practice-${action}:${attemptId}:${skillAttemptId}:${signature}`
}

export function practiceAnswersFromCheckpoint(answers: CheckpointAnswer[]) {
  return answers.map((a, i) => ({
    question_id: a.question_id,
    client_answer_seq: a.client_answer_seq ?? i + 1,
    value: Array.isArray(a.answer) ? JSON.stringify(a.answer) : (a.answer ?? ''),
  }))
}

// ============================================================
// HTML Question Extractor (legacy play.json format)
// Legacy play.json stores questions as HTML inside question_groups[].question,
// with input fields (name="q-N") for each question.
// ============================================================

function cleanText(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface ExtractedQuestion {
  id: string
  type: import('@/types/exam').QuestionType
  text: string
  html?: string
  options?: Array<{ id: string; text: string; letter: string }>
  max_words?: number
}

/** Get the instruction text (e.g. "Write ONE WORD AND/OR A NUMBER") from HTML. */
function extractInstruction(html: string): { text: string; maxWords?: number } {
  // Find instruction patterns
  const wordPatterns = [
    /ONE\s+WORD\s+(?:AND\/OR\s+)?A\s+NUMBER/i,
    /NO\s+MORE\s+THAN\s+ONE\s+WORD/i,
  ]
  const numMatch = html.match(wordPatterns[0])
  const oneWordMatch = html.match(wordPatterns[1])
  if (numMatch) return { text: numMatch[0], maxWords: 2 }
  if (oneWordMatch) return { text: oneWordMatch[0], maxWords: 1 }
  return { text: '' }
}

/** Extract text that appears before a given position, looking back for meaningful question text.
 *  Stops at section headings like "SECTION 1", table boundaries, and major headings. */
function findPrecedingQuestionText(html: string, endPos: number): string {
  const before = html.substring(0, endPos)
  // Remove table content — tables have their own structure
  const withoutTables = before.replace(/<table[\s\S]*?<\/table>/gi, '|TABLE|')
  // Get the last ~500 chars before the input (enough for question text + options)
  const snippet = withoutTables.slice(-600)
  // Strip tags, get plain text lines
  const lines = cleanText(snippet).split('\n').filter(Boolean)
  if (lines.length === 0) return ''
  // Return the last few meaningful lines as the question text
  const lastLines = lines.slice(-4).join(' ').trim()
  return lastLines
}

/** Find the start of the question block that the input at endPos belongs to.
 *  Looks for the last <p>, <li>, or <strong> heading that introduces this question. */
function findQuestionHtmlStart(html: string, endPos: number): number {
  const snippet = html.substring(0, endPos)
  // Try to find the last <p> or <li> heading near the input — look back ~800 chars
  const tail = snippet.slice(-800)

  // Pattern 1: <p><strong>Question number</strong></p> — question headings
  const qHeadMatch = [...tail.matchAll(/<p[^>]*>\s*<strong>(?:Questions?\s+\d+(?:-\d+)?)[^<]*<\/strong>\s*<\/p>\s*$/gi)]
  if (qHeadMatch.length > 0) {
    return endPos - (tail.length - (qHeadMatch[qHeadMatch.length - 1].index ?? 0))
  }

  // Pattern 2: <p>instruction text</p> followed by items
  const pEndMatch = [...tail.matchAll(/<p[^>]*>[^<]+<\/p>\s*$/gi)]
  if (pEndMatch.length > 0) {
    return endPos - (tail.length - (pEndMatch[pEndMatch.length - 1].index ?? 0))
  }

  // Pattern 3: list items — find the nearest <li> start
  const liMatch = [...tail.matchAll(/<li[^>]*>/gi)]
  if (liMatch.length > 0) {
    return endPos - (tail.length - (liMatch[liMatch.length - 1].index ?? 0))
  }

  return Math.max(0, endPos - 600)
}

/** Build a concise but rich HTML snippet for a single question, including the input field.
 *  For fill-blank: shows question text + input.
 *  For radio/checkbox: shows question text + options.
 *  For select (matching): shows the full matching table. */
/** Post-process HTML: replace input/select with styled placeholders */
function enhanceHtml(html: string): string {
  let result = html
  // Replace <input ... name="q-N" ...> with visible placeholder
  result = result.replace(
    /<input\s[^>]*name="(q-[\w-]+)"[^>]*>/gi,
    (_, name) => `<span class="exam-input-placeholder" data-name="${name}">[Answer: ${name}]</span>`
  )
  // Replace <select ...>...<option ...> with readable list
  result = result.replace(
    /<select\s[^>]*name="(q-[\w-]+)"[^>]*>([\s\S]*?)<\/select>/gi,
    (_, name, opts) => {
      const options = [...opts.matchAll(/<option\s[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi)]
        .map(m => `${m[1]}. ${m[2]}`)
        .join(' | ')
      return `<div class="exam-select-placeholder">[${name}: ${options}]</div>`
    }
  )
  return result
}

function buildQuestionHtml(html: string, startPos: number, endPos: number): string {
  const extendedEnd = Math.min(endPos + 100, html.length)
  const raw = html.substring(startPos, extendedEnd)
  return enhanceHtml(raw)
}

function extractQuestionsFromGroupHtml(
  groupHtml: string,
  _groupIndex: number,
  _partIndex: number,
  _listeningTimes: Array<{ start_time: number; end_time: number }>,
  globalSeq: { value: number },
): ExtractedQuestion[] {
  const questions: ExtractedQuestion[] = []

  const instruction = extractInstruction(groupHtml)

  // ---- 1. Fill-blank: <input type="text" name="q-N" /> ----
  const textInputPattern = /<input\s[^>]*name="q-(\d+)"[^>]*type="text"[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = textInputPattern.exec(groupHtml)) !== null) {
    globalSeq.value++
    const qNum = match[1]
    const endPos = match.index + match[0].length
    const startPos = findQuestionHtmlStart(groupHtml, endPos)
    questions.push({
      id: `q-${qNum}`,
      type: 'fill_blank',
      text: cleanText(groupHtml.substring(startPos, endPos)),
      html: buildQuestionHtml(groupHtml, startPos, endPos),
      max_words: instruction.maxWords,
    })
  }

  // ---- 2. Radio + Checkbox questions ----
  const checkboxMap: Record<string, Array<{ value: string; text: string }>> = {}
  const radioMap: Record<string, Array<{ value: string; text: string }>> = {}

  // Match both radio and checkbox inputs
  const rcInputPattern = /<input\s[^>]*name="q-([\w-]+)"[^>]*type="(radio|checkbox)"[^>]*value="([^"]*)"[^>]*\/?>([^<]*)/gi
  let rcMatch: RegExpExecArray | null
  while ((rcMatch = rcInputPattern.exec(groupHtml)) !== null) {
    const qNum = rcMatch[1]
    const inputType = rcMatch[2]
    const value = rcMatch[3].trim()
    const afterInput = rcMatch[4] || ''
    const afterPos = rcMatch.index + rcMatch[0].length
    const next60 = groupHtml.slice(afterPos, afterPos + 80)
    const labelMatch = next60.match(/<strong>([^<]+)<\/strong>([^<]*)/)
      || next60.match(/>([^<]+)<\/[^>]+>/)
    const labelText = labelMatch
      ? cleanText(labelMatch[1] + (labelMatch[2] || ''))
      : cleanText(afterInput)
    const map = inputType === 'checkbox' ? checkboxMap : radioMap
    if (!map[qNum]) map[qNum] = []
    if (!map[qNum].find(o => o.value === value)) {
      map[qNum].push({ value, text: labelText })
    }
  }

  // Emit checkbox questions
  for (const [qNum, opts] of Object.entries(checkboxMap)) {
    const inputPos = groupHtml.indexOf(`name="${qNum}"`)
    const startPos = findQuestionHtmlStart(groupHtml, inputPos)
    globalSeq.value++
    questions.push({
      id: `q-${qNum}`,
      type: 'multiple_choice',
      text: cleanText(groupHtml.substring(startPos, inputPos)),
      html: buildQuestionHtml(groupHtml, startPos, inputPos),
      options: opts.map((o, i) => ({
        id: String.fromCharCode(97 + i),
        text: o.text || o.value,
        letter: o.value,
      })),
    })
  }

  // Emit radio questions (skip if already covered by tables)
  for (const [qNum, opts] of Object.entries(radioMap)) {
    if (!questions.find(q => q.id === `q-${qNum}`)) {
      const inputPos = groupHtml.indexOf(`name="${qNum}"`)
      const startPos = findQuestionHtmlStart(groupHtml, inputPos)
      globalSeq.value++
      questions.push({
        id: `q-${qNum}`,
        type: 'multiple_choice',
        text: cleanText(groupHtml.substring(startPos, inputPos)),
        html: buildQuestionHtml(groupHtml, startPos, inputPos),
        options: opts.map((o, i) => ({
          id: String.fromCharCode(97 + i),
          text: o.text || o.value,
          letter: o.value,
        })),
      })
    }
  }

  // ---- 3. Select (matching) questions: q-15, q-16, ... ----
  const selectPattern = /<select\s[^>]*name="(q-[\w-]+)"[^>]*>/gi
  let selectMatch: RegExpExecArray | null
  while ((selectMatch = selectPattern.exec(groupHtml)) !== null) {
    const qNum = selectMatch[1]
    // Check if already handled
    if (questions.find(q => q.id === `q-${qNum}`)) continue

    const selectStart = selectMatch.index
    // Find the closing </select>
    const afterSelect = groupHtml.slice(selectStart)
    const closeMatch = afterSelect.match(/<\/select>/)
    if (!closeMatch) continue
    const selectEnd = selectStart + afterSelect.indexOf('</select>') + closeMatch[0].length

    // Look back for the question context (store name like "Hallberry")
    const beforeSelect = groupHtml.substring(0, selectStart)
    const contextStart = findQuestionHtmlStart(beforeSelect, selectStart)
    globalSeq.value++
    questions.push({
      id: `q-${qNum}`,
      type: 'matching',
      text: cleanText(groupHtml.substring(contextStart, selectStart)),
      html: buildQuestionHtml(groupHtml, contextStart, selectEnd),
    })
  }

  // ---- 4. Table-based radio questions (map labeling) ----
  const tablePattern = /<table[\s\S]*?<\/table>/gi
  let tableMatch: RegExpExecArray | null
  while ((tableMatch = tablePattern.exec(groupHtml)) !== null) {
    const tableHtml = tableMatch[0]
    const headerCells: string[] = []
    const headerMatch = tableHtml.match(/<tr[\s\S]*?<\/tr>/i)
    if (headerMatch) {
      const cellMatches = headerMatch[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)
      for (const cell of cellMatches) {
        headerCells.push(cleanText(cell[1]).trim())
      }
    }
    const dataRowPattern = /<tr[\s\S]*?<\/tr>/gi
    let rowMatch: RegExpExecArray | null
    let rowIndex = 0
    while ((rowMatch = dataRowPattern.exec(tableHtml)) !== null) {
      if (rowIndex === 0) { rowIndex++; continue }
      const row = rowMatch[0]
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => c[1])
      if (cells.length === 0) { rowIndex++; continue }
      const firstCell = cells[0]
      const optionCells = cells.slice(1)
      const firstRadio = firstCell.match(/name="q-(\d+)"/)
      if (firstRadio) {
        const qNum = firstRadio[1]
        if (!questions.find(q => q.id === `q-${qNum}`)) {
          const radioPos = firstCell.indexOf(firstRadio[0])
          const qText = findPrecedingQuestionText(firstCell, radioPos)
          globalSeq.value++
          const options: Array<{ id: string; text: string; letter: string }> = []
          optionCells.forEach((cell, i) => {
            const header = headerCells[i + 1] || String.fromCharCode(65 + i)
            const hasRadio = /<input\s[^>]*type="radio"/.test(cell)
            if (hasRadio || headerCells.length > 0) {
              options.push({
                id: String.fromCharCode(97 + i),
                text: cleanText(header),
                letter: header,
              })
            }
          })
          if (options.length > 0) {
            questions.push({
              id: `q-${qNum}`,
              type: 'multiple_choice',
              text: qText || `Question ${qNum}`,
              html: firstCell,
            })
          }
        }
      }
      rowIndex++
    }
  }

  return questions.sort((a, b) => {
    const numA = parseInt(a.id.replace('q-', '').split('-')[0], 10) || 0
    const numB = parseInt(b.id.replace('q-', '').split('-')[0], 10) || 0
    return numA - numB
  })
}

// ============================================================
// Get Attempt
// ============================================================

export const useAttempt = (
  attemptId: string,
  options?: { runtime?: AttemptRuntime },
) => {
  const runtime = options?.runtime ?? 'exam'

  return useQuery({
    queryKey: ['attempt', runtime, attemptId],
    queryFn: async () => {
      const response = await api.get(`${attemptBasePath(runtime)}/${attemptId}`)
      const raw = unwrapApiData<Record<string, unknown>>(response.data)

      const id =
        (raw.practice_attempt_id as string) ||
        (raw.attempt_id as string) ||
        (raw.id as string) ||
        ''

      // Handle skills array from backend (LRW flow)
      const rawSkills = raw.skills as Array<{
        practice_skill_attempt_id?: string
        skill_attempt_id?: string
        id?: string
        skill?: string
        status?: string
        exam_uuid?: string
        exam_play_url?: string
        exam_play_expires_at?: string
        audio_url?: string
        started_at?: string
        expires_at?: string
        submitted_at?: string
      }> | undefined

      const skills = rawSkills?.map((s) => ({
        id: (s.practice_skill_attempt_id || s.skill_attempt_id || s.id || '') as string,
        skill_type: (s.skill || 'reading') as import('@/types/exam').SkillType,
        status: ((s.status === 'submitted' || s.status === 'scored' || s.status === 'graded')
          ? 'submitted'
          : s.status === 'in_progress'
          ? 'in_progress'
          : 'not_started') as import('@/types/exam').SkillStatus,
        started_at: s.started_at,
        expires_at: s.expires_at,
        submitted_at: s.submitted_at,
        exam_play_url: s.exam_play_url,
        exam_play_expires_at: s.exam_play_expires_at,
        audio_url: s.audio_url,
      }))

      const firstSkill = rawSkills?.[0]
      const mapped: ExamAttempt = {
        id,
        exam_id: '',
        user_id: '',
        runtime,
        mode: (raw.mode as ExamAttempt['mode']) || 'skill_practice',
        started_at: '',
        skill: (raw.skill || firstSkill?.skill || 'reading') as ExamAttempt['skill'],
        skill_attempt_id:
          (raw.practice_skill_attempt_id as string) ||
          (raw.skill_attempt_id as string) ||
          (firstSkill?.practice_skill_attempt_id || firstSkill?.skill_attempt_id || firstSkill?.id || '') as string,
        exam_uuid: (raw.exam_uuid as string) || (firstSkill?.exam_uuid as string) || '',
        exam_play_url: (raw.exam_play_url as string) || (firstSkill?.exam_play_url as string) || undefined,
        exam_play_expires_at: (raw.exam_play_expires_at as string) || (firstSkill?.exam_play_expires_at as string) || undefined,
        audio_url: (raw.audio_url as string) || (firstSkill?.audio_url as string) || undefined,
        status: (raw.status as ExamAttempt['status']) || 'in_progress',
        expires_at: (firstSkill?.expires_at as string | undefined) || (raw.expires_at as string | undefined) || '',
        latest_server_seq: raw.latest_server_seq as number | undefined,
        answers: raw.answers as ExamAttempt['answers'],
        skills: skills || [],
      }
      return mapped
    },
    enabled: !!attemptId,
    staleTime: 10 * 1000,
    refetchInterval: (query) => {
      const attempt = query.state.data
      if (attempt?.status === 'in_progress') return 30 * 1000
      return false
    },
  })
}

// ============================================================
// Auto-Save
// ============================================================

export interface AutoSaveRequest {
  answers: CheckpointAnswer[]
}

export const useAutoSave = () => {

  return useMutation({
    mutationFn: async ({
      attemptId,
      skillAttemptId,
      answers,
      runtime = 'exam',
    }: {
      attemptId: string
      skillAttemptId: string
      answers: CheckpointAnswer[]
      runtime?: AttemptRuntime
    }) => {
      const dirty = answers.map((a, i) => ({
        question_id: a.question_id,
        client_answer_seq: a.client_answer_seq ?? i + 1,
        answer: a.answer,
      }))
      const idempotencyKey = createAttemptMutationKey(
        'autosave',
        attemptId,
        skillAttemptId,
        dirty,
      )
      const response = await api.patch(
        `${attemptBasePath(runtime)}/${attemptId}/skills/${skillAttemptId}/autosave`,
        runtime === 'practice'
          ? {
              idempotency_key: idempotencyKey,
              answers: practiceAnswersFromCheckpoint(answers),
            }
          : {
              idempotency_key: idempotencyKey,
              dirty,
            },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      return response.data
    },
  })
}

// ============================================================
// Get Checkpoint (restore on reload)
// ============================================================

// No GET checkpoint endpoint in exam-attempt-service — answers come from useAttempt resume response
export const useCheckpoint = (_attemptId: string, _skillAttemptId: string) => {
  return { data: null as Checkpoint | null, isLoading: false, error: null }
}

// ============================================================
// Submit Skill
// ============================================================

export interface SubmitSkillRequest {
  answers: CheckpointAnswer[]
  submitted_at?: string
}

export const useSubmitSkill = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      attemptId,
      skillAttemptId,
      answers,
      runtime = 'exam',
    }: {
      attemptId: string
      skillAttemptId: string
      answers: CheckpointAnswer[]
      runtime?: AttemptRuntime
    }) => {
      const dirty = answers.map((a, i) => ({
        question_id: a.question_id,
        client_answer_seq: a.client_answer_seq ?? i + 1,
        answer: a.answer,
      }))
      const idempotencyKey = createAttemptMutationKey(
        'submit',
        attemptId,
        skillAttemptId,
        dirty,
      )
      try {
        const response = await api.post(
          `${attemptBasePath(runtime)}/${attemptId}/skills/${skillAttemptId}/submit`,
          runtime === 'practice'
            ? {
                idempotency_key: idempotencyKey,
                answers: practiceAnswersFromCheckpoint(answers),
              }
            : {
                idempotency_key: idempotencyKey,
                dirty,
              },
          { headers: { 'Idempotency-Key': idempotencyKey } },
        )
        return response.data
      } catch (error) {
        const maybeAxiosError = error as {
          response?: { status?: number; data?: { error?: { code?: string } } }
        }
        const errorCode = maybeAxiosError.response?.data?.error?.code
        if (
          runtime === 'practice' &&
          maybeAxiosError.response?.status === 409 &&
          errorCode === 'already_submitted'
        ) {
          return {
            id: skillAttemptId,
            attempt_id: attemptId,
            practice_attempt_id: attemptId,
            practice_skill_attempt_id: skillAttemptId,
            already_submitted: true,
          }
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attempt', 'submit'] })
      queryClient.invalidateQueries({ queryKey: ['attempt-results'] })
      queryClient.invalidateQueries({ queryKey: ['exam-history'] })
      toast.success('Skill submitted successfully')
    },
    onError: () => {
      toast.error('Failed to submit skill. Please try again.')
    },
  })
}

// ============================================================
// Start Attempt (via exam-attempt-service)
// ============================================================

export interface StartAttemptRequest {
  mode?: string
  skill?: string
  idempotency_key?: string
  appointment_id?: string
}

export const useStartAttempt = () => {
  return useMutation({
    mutationFn: async (data: StartAttemptRequest) => {
      const response = await api.post('/api/v1/attempts', data)
      return response.data
    },
  })
}

// ============================================================
// Get Results
// ============================================================

export const useAttemptResults = (
  attemptId: string,
  options?: { runtime?: AttemptRuntime },
) => {
  const runtime = options?.runtime ?? 'exam'

  return useQuery({
    queryKey: ['attempt-results', runtime, attemptId],
    queryFn: async () => {
      const response = await api.get<{ data: ExamResult }>(
        `${attemptBasePath(runtime)}/${attemptId}/results`
      )
      return unwrapApiData<ExamResult>(response.data)
    },
    enabled: !!attemptId,
    staleTime: 30 * 1000,
    refetchInterval: (query) => {
      const result = query.state.data
      if (result && (!result.visible || result.grading_state === 'processing')) return 5 * 1000
      return false
    },
  })
}

// ============================================================
// Exam Play Content (presigned S3 URL → actual exam questions)
// ============================================================

export interface ExamPlayContent {
  exam_id: string
  skill: string
  title?: string
  questions: import('@/types/exam').Question[]
  time_limit_minutes?: number
  instructions?: string
  audio_url?: string
  passage?: string
  /** Full HTML content per part — each entry is the complete question group HTML
   *  for that part, with interactive input placeholders ready to render. */
  parts_html?: Array<{
    part_index: number
    html: string
  }>
}

interface ExamPlayContentOptions {
  attemptId?: string
  skillAttemptId?: string
  runtime?: AttemptRuntime
  audioUrl?: string
}

function escapeExamHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeQuestionName(index: number): string {
  return `q${index}`
}

function buildSubjectivePartHtml(part: Record<string, unknown>, skillType: string): string {
  const partIndex = (part.part_index as number) ?? 0
  const questionGroups = (part.question_groups as Array<Record<string, unknown>> | undefined) ?? []
  const blocks: string[] = []
  const partQuestion = String(part.question || '').trim()

  if (partQuestion) {
    blocks.push(`<section class="subjective-part"><h3>Part ${partIndex || 1}</h3><p>${escapeExamHtml(partQuestion)}</p></section>`)
  }

  let questionSeq = 0
  questionGroups.forEach((group) => {
    const title = String(group.title || '').trim()
    const groupQuestion = String(group.question || '').trim()
    const rawQuestions = (group.questions as Array<Record<string, unknown>> | undefined) ?? []

    if (title) {
      blocks.push(`<h4>${escapeExamHtml(title)}</h4>`)
    }
    if (groupQuestion) {
      blocks.push(`<div class="subjective-prompt">${groupQuestion}</div>`)
    }

    rawQuestions.forEach((question) => {
      questionSeq += 1
      const questionText = String(question.question || question.text || question.question_text || question.prompt || '').trim()
      if (!questionText) return
      const inputName = normalizeQuestionName(questionSeq)
      const heading = skillType === 'speaking' ? `Speaking prompt ${questionSeq}` : `Writing task ${questionSeq}`
      const control = skillType === 'speaking'
        ? `<textarea name="${inputName}" rows="6" class="exam-input exam-textarea" data-name="${inputName}" placeholder="Type notes or your spoken response transcript here..."></textarea>`
        : `<textarea name="${inputName}" rows="14" class="exam-input exam-textarea" data-name="${inputName}" placeholder="Write your answer here..."></textarea>`
      blocks.push(`<section class="subjective-question"><h4>${heading}</h4><p>${escapeExamHtml(questionText)}</p>${control}</section>`)
    })
  })

  if (questionSeq === 0 && partQuestion) {
    const inputName = normalizeQuestionName(partIndex || 1)
    const control = skillType === 'speaking'
      ? `<textarea name="${inputName}" rows="6" class="exam-input exam-textarea" data-name="${inputName}" placeholder="Type notes or your spoken response transcript here..."></textarea>`
      : `<textarea name="${inputName}" rows="14" class="exam-input exam-textarea" data-name="${inputName}" placeholder="Write your answer here..."></textarea>`
    blocks.push(control)
  }

  return blocks.join('\n')
}

function buildPartHtml(part: Record<string, unknown>, skillType: string): string {
  if (skillType === 'writing' || skillType === 'speaking') {
    return buildSubjectivePartHtml(part, skillType)
  }

  const questionGroups = (part.question_groups as Array<Record<string, unknown>> | undefined) ?? []
  return questionGroups
    .map((g) => String(g.question || ''))
    .join('\n')
}

/** Fetches the actual exam questions from a presigned play.json URL.
 * If S3 returns 403/Expired, automatically fetches a fresh presigned URL from the
 * exam-attempt-service /presign endpoint (max 1 refresh to avoid loops). */
export const useExamPlayContent = (
  playUrl: string | undefined,
  options?: ExamPlayContentOptions,
) => {
  console.log('[DEBUG] useExamPlayContent called, playUrl:', playUrl)
  return useQuery({
    queryKey: ['exam-play', options?.runtime ?? 'exam', playUrl],
    queryFn: async (): Promise<ExamPlayContent | null> => {
      if (!playUrl) return null

      let lastErr: Error | null = null
      let url = playUrl
      let refreshedAudioUrl = options?.audioUrl

      // Try once; if S3 rejects it, refresh URL and retry once.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch(url!, { signal: AbortSignal.timeout(15000) })
          if (!response.ok) {
            // 403/404 from S3 = expired/invalid presigned URL
            if ((response.status === 403 || response.status === 404) && options?.attemptId && attempt === 0) {
              // Attempt refresh
              const refreshed = await api.get<{
                skills?: Array<{
                  practice_skill_attempt_id?: string
                  skill_attempt_id?: string
                  exam_play_url?: string
                  audio_url?: string
                }>
              }>(`${attemptBasePath(options.runtime ?? 'exam')}/${options.attemptId}/presign`)
              const skills = refreshed.data?.skills ?? []
              const refreshedSkill = options.skillAttemptId
                ? skills.find((s) =>
                  (s.practice_skill_attempt_id || s.skill_attempt_id) === options.skillAttemptId
                )
                : skills[0]
              if (refreshedSkill?.audio_url) {
                refreshedAudioUrl = refreshedSkill.audio_url
              }
              if (refreshedSkill?.exam_play_url && refreshedSkill.exam_play_url !== url) {
                url = refreshedSkill.exam_play_url
                continue // retry with new URL
              }
            }
            throw new Error(`Failed to fetch exam content: ${response.status}`)
          }
          const data = await response.json() as Record<string, unknown>
          const parts = (data.parts as Array<Record<string, unknown>> | undefined) ?? []
          const skillType = String(data.type || data.skill || 'reading')
          const examId = String(data.exam_uuid || data.exam_id || '')

          const resolvedAudioUrl =
            options?.audioUrl ||
            refreshedAudioUrl ||
            (data.audio_url as string | undefined)

          // Flatten parts → question_groups → questions into a flat array
          // Strategy:
          // 1. If question_groups[].questions[] has items → use structured data (new format)
          // 2. If empty → extract from HTML inside question_groups[].question (legacy format)
          let seq = 0
          const questions = parts.flatMap((part) => {
            const partIndex = (part.part_index as number) ?? 0
            const partQuestion = String(part.question || '')
            const listeningTimes = (part.listening_times as Array<{start_time: number; end_time: number}> | undefined) ?? []
            const questionGroups = (part.question_groups as Array<Record<string, unknown>> | undefined) ?? []
            return questionGroups.flatMap((group) => {
              const groupQuestion = String(group.question || '')
              const groupAudio = group.audio_file as Record<string, unknown> | null | undefined
              const groupAudioS3Key = groupAudio?.s3_key as string | undefined
              const groupIndex = (group.group_index as number) ?? 0
              const rawQuestions = (group.questions as Array<Record<string, unknown>> | undefined) ?? []

              // Legacy format: questions are embedded in HTML within question_groups[].question
              if (rawQuestions.length === 0 && groupQuestion) {
                const extracted = extractQuestionsFromGroupHtml(
                  groupQuestion,
                  groupIndex,
                  partIndex,
                  listeningTimes,
                  { value: seq },
                )
                return extracted.map((q) => ({
                  id: q.id,
                  type: q.type,
                  text: q.text,
                  html: q.html,
                  audio_url: undefined,
                  passage: undefined,
                  image_url: undefined,
                  options: q.options,
                  correct_answer: undefined,
                  max_words: q.max_words,
                  part_index: partIndex,
                  group_index: groupIndex,
                  question_index: 0,
                  listening_times: listeningTimes,
                } as import('@/types/exam').Question))
              }

              // New structured format
              const passageText = rawQuestions
                .map((rq) => String(rq.question || rq.text || rq.question_text || ''))
                .filter(Boolean)
                .join('\n')
              return rawQuestions.map((q) => {
                seq++
                const qIndex = (q.question_index as number) ?? seq
                const qType = String(q.question_type || q.type || 'multiple_choice').toLowerCase()
                const qText = String(q.question || q.text || q.question_text || q.prompt || '')
                const finalText = qText || groupQuestion || partQuestion
                const rawOptions = (q.answers ?? q.options) as Array<Record<string, unknown>> | undefined
                const hasOptions = qType === 'multiple_choice' || qType === 'single-choice' || qType === 'true_false' || qType === 'truefalse' || qType === 'matching'

                return {
                  id: String(q.id || q.question_id || `q${seq}`),
                  type: (
                    qType === 'single-choice' ? 'multiple_choice'
                    : qType === 'truefalse' || qType === 'true_false_notgiven' ? 'true_false'
                    : qType === 'fillblank' || qType === 'fill-blank' ? 'fill_blank'
                    : qType as import('@/types/exam').QuestionType
                  ),
                  text: finalText,
                  audio_url: groupAudioS3Key ? undefined : (q.audio_url as string | undefined),
                  passage: passageText || undefined,
                  image_url: q.image_url as string | undefined,
                  options: hasOptions && rawOptions ? rawOptions.map((o, i) => {
                    if (o.answer !== undefined) {
                      const answerStr = String(o.answer)
                      return {
                        id: String(o.id || String.fromCharCode(97 + i)),
                        text: answerStr,
                        letter: String.fromCharCode(65 + i),
                        correct: Boolean(o.correct),
                      }
                    }
                    return {
                      id: String(o.id || o.option_id || String.fromCharCode(97 + i)),
                      text: String(o.text || o.option_text || ''),
                      letter: String.fromCharCode(65 + i),
                    }
                  }) : undefined,
                  correct_answer: q.correct_answer as string | string[] | undefined,
                  max_words: q.max_words as number | undefined,
                  part_index: partIndex,
                  group_index: groupIndex,
                  question_index: qIndex,
                  listening_times: listeningTimes,
                } as import('@/types/exam').Question
              })
            })
          })

          const parts_html = parts.map((part) => {
            const partIndex = (part.part_index as number) ?? 0
            return {
              part_index: partIndex,
              html: buildPartHtml(part, skillType),
            }
          })

          return {
            exam_id: examId,
            skill: skillType,
            title: data.title as string | undefined,
            questions,
            time_limit_minutes: data.time_limit_minutes as number | undefined,
            instructions: data.instructions as string | undefined,
            audio_url: resolvedAudioUrl,
            passage: data.passage as string | undefined,
            parts_html,
          }
        } catch (err) {
          lastErr = err as Error
          break // don't retry on non-403/404 errors
        }
      }

      throw lastErr ?? new Error('Failed to fetch exam content')
    },
    enabled: !!playUrl,
    staleTime: 5 * 60 * 1000,
    retry: 0, // retry is handled manually above (S3 auth errors won't recover with network retry)
  })
}
