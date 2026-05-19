import { useState } from 'react'
import { useExamPlayContent } from '@/api/attempts'
import type { ExamAttempt, SkillType } from '@/types/exam'

// Hardcoded response tuong ung voi API response ban dau
const SAMPLE_RESPONSE = {
  attempt_id: '8c250a95-4d3d-4d6e-ac9e-5b0257660305',
  audio_url: 'https://s3.vn-hcm-1.vietnix.cloud/ielts/exams/a787954e-99dd-4b81-b56d-c241af7886ea/audio.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=e6f72f5bdef512ffX11G%2F20260515%2Fvn-hcm-1%2Fs3%2Faws4_request&X-Amz-Date=20260515T043649Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=4fd9f6da5cc92f1dc1f2fd07122b2cd8cdaa53533bf41209b3ba0558dc21eacf',
  exam_play_expires_at: '2291-12-06T06:58:08.92493364+07:00',
  exam_play_url: 'https://s3.vn-hcm-1.vietnix.cloud/ielts/exams/a787954e-99dd-4b81-b56d-c241af7886ea/play.json?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=e6f72f5bdef512ffX11G%2F20260515%2Fvn-hcm-1%2Fs3%2Faws4_request&X-Amz-Date=20260515T043649Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=13a5d5cb957b490d5869428b36c3c755bcd79c1ac80534d660a15b60cf8d09ae',
  exam_uuid: 'a787954e-99dd-4b81-b56d-c241af7886ea',
  existing_in_progress: false,
  expires_at: '2026-05-15T05:36:48.626482Z',
  recycled: false,
  skill: 'listening',
  skill_attempt_id: '0d0ea4f9-52cf-4fee-887e-0cd04aef752a',
  status: 'in_progress',
  skills: [
    {
      audio_url: 'https://s3.vn-hcm-1.vietnix.cloud/ielts/exams/a787954e-99dd-4b81-b56d-c241af7886ea/audio.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=e6f72f5bdef512ffX11G%2F20260515%2Fvn-hcm-1%2Fs3%2Faws4_request&X-Amz-Date=20260515T043649Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=4fd9f6da5cc92f1dc1f2fd07122b2cd8cdaa53533bf41209b3ba0558dc21eacf',
      exam_play_expires_at: '2275-09-30T19:01:29.43258664+07:00',
      exam_play_url: 'https://s3.vn-hcm-1.vietnix.cloud/ielts/exams/a787954e-99dd-4b81-b56d-c241af7886ea/play.json?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=e6f72f5bdef512ffX11G%2F20260515%2Fvn-hcm-1%2Fs3%2Faws4_request&X-Amz-Date=20260515T043649Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=13a5d5cb957b490d5869428b36c3c755bcd79c1ac80534d660a15b60cf8d09ae',
      exam_uuid: 'a787954e-99dd-4b81-b56d-c241af7886ea',
      expires_at: '2026-05-15T05:36:48.626482Z',
      skill: 'listening',
      skill_attempt_id: '0d0ea4f9-52cf-4fee-887e-0cd04aef752a',
      started_at: '2026-05-15T04:36:48.399334Z',
      status: 'in_progress',
    },
  ],
}

function mapRawToExamAttempt(raw: typeof SAMPLE_RESPONSE): ExamAttempt {
  const rawSkills = raw.skills
  const skills = rawSkills?.map((s) => ({
    id: (s.skill_attempt_id || '') as string,
    skill_type: (s.skill || 'reading') as SkillType,
    status: ((s.status === 'submitted' || s.status === 'scored')
      ? 'submitted'
      : s.status === 'in_progress'
      ? 'in_progress'
      : 'not_started') as import('@/types/exam').SkillStatus,
    started_at: s.started_at,
    expires_at: s.expires_at,
    submitted_at: undefined as string | undefined,
    exam_play_url: s.exam_play_url,
    exam_play_expires_at: s.exam_play_expires_at,
    audio_url: s.audio_url,
  })) || []

  const firstSkill = rawSkills?.[0]

  return {
    id: raw.attempt_id,
    exam_id: '',
    user_id: '',
    mode: 'skill_practice',
    started_at: '',
    skill: (raw.skill || firstSkill?.skill || 'reading') as ExamAttempt['skill'],
    skill_attempt_id: (raw.skill_attempt_id as string) || (firstSkill?.skill_attempt_id || '') as string,
    exam_uuid: (raw.exam_uuid as string) || (firstSkill?.exam_uuid as string) || '',
    exam_play_url: (raw.exam_play_url as string) || (firstSkill?.exam_play_url as string) || undefined,
    exam_play_expires_at: (raw.exam_play_expires_at as string) || (firstSkill?.exam_play_expires_at as string) || undefined,
    status: (raw.status as ExamAttempt['status']) || 'in_progress',
    expires_at: (firstSkill?.expires_at as string | undefined) || (raw.expires_at as string | undefined) || '',
    latest_server_seq: undefined,
    answers: undefined,
    skills,
  }
}

// Show raw JSON with syntax highlighting
function JsonView({ data }: { data: unknown }) {
  const json = JSON.stringify(data, null, 2)
  return (
    <pre className="text-xs font-mono bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-[600px]">
      {json}
    </pre>
  )
}

// Compact field card
function FieldCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-100">
      <span className="text-gray-500 text-sm min-w-[160px] shrink-0">{label}:</span>
      <span className="text-gray-900 text-sm font-mono break-all">{value}</span>
    </div>
  )
}

function FieldCardStatus({ label, value }: { label: string; value: string }) {
  const colorMap: Record<string, string> = {
    in_progress: 'text-blue-600 bg-blue-50',
    submitted: 'text-green-600 bg-green-50',
    not_started: 'text-gray-500 bg-gray-50',
    in_review: 'text-yellow-600 bg-yellow-50',
  }
  const cls = colorMap[value] || 'text-gray-600 bg-gray-50'
  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-100">
      <span className="text-gray-500 text-sm min-w-[160px] shrink-0">{label}:</span>
      <span className={`text-sm font-medium px-2 py-0.5 rounded ${cls}`}>{value}</span>
    </div>
  )
}

export default function DebugExamSessionPage() {
  const [view, setView] = useState<'raw' | 'mapped' | 'exam'>('raw')
  const [multiSkill, setMultiSkill] = useState(false)
  const [selectedPartIdx, setSelectedPartIdx] = useState(0)

  const attempt: ExamAttempt = mapRawToExamAttempt(SAMPLE_RESPONSE)
  const isMultiSkill = multiSkill || (attempt.skills?.length ?? 0) > 1
  const skillType: SkillType = attempt.skill || attempt.skills?.[0]?.skill_type || 'reading'

  const activeSkillData = attempt.skills?.find((s: { skill_type: SkillType }) => s.skill_type === skillType)
  const { data: playContent, isLoading } = useExamPlayContent(
    activeSkillData?.exam_play_url ?? attempt.exam_play_url,
    { attemptId: attempt.id, skillAttemptId: activeSkillData?.id },
  )

  const audioUrl = skillType === 'listening'
    ? (attempt.audio_url || activeSkillData?.audio_url || undefined)
    : undefined

  const questions = playContent?.questions ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Debug: Exam Response Viewer</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 mr-2">Mode:</span>
            {(['raw', 'mapped', 'exam'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  view === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {v === 'raw' ? 'Raw JSON' : v === 'mapped' ? 'Mapped Fields' : 'Exam UI'}
              </button>
            ))}
            <span className="text-xs text-gray-400 mx-2">|</span>
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={multiSkill}
                onChange={(e) => setMultiSkill(e.target.checked)}
                className="rounded"
              />
              Multi-skill
            </label>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {view === 'raw' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Raw API Response</h2>
            <p className="text-sm text-gray-500 mb-4">API response goc tu backend (snake_case)</p>
            <JsonView data={SAMPLE_RESPONSE} />
          </div>
        )}

        {view === 'mapped' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Mapped ExamAttempt</h2>
            <p className="text-sm text-gray-500 mb-4">
              useAttempt() transform raw JSON sang ExamAttempt interface (camelCase)
            </p>

            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Top-level Fields</h3>
              <FieldCard label="id" value={attempt.id} />
              <FieldCard label="skill" value={attempt.skill || '—'} />
              <FieldCard label="skill_attempt_id" value={attempt.skill_attempt_id || '—'} />
              <FieldCard label="exam_uuid" value={attempt.exam_uuid || '—'} />
              <FieldCard label="exam_play_url" value={attempt.exam_play_url || '—'} />
              <FieldCard label="exam_play_expires_at" value={attempt.exam_play_expires_at || '—'} />
              <FieldCard label="status" value={attempt.status} />
              <FieldCard label="expires_at" value={attempt.expires_at || '—'} />
              <FieldCard label="audio_url" value={attempt.audio_url || '—'} />
              <FieldCardStatus label="isMultiSkill" value={String(isMultiSkill)} />
              <FieldCardStatus label="activeSkill" value={skillType} />
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-6 mt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Skills Array ({attempt.skills?.length ?? 0})</h3>
              {attempt.skills?.map((skill, i) => (
                <div key={skill.id || i} className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">{skill.skill_type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      skill.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      skill.status === 'submitted' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{skill.status}</span>
                  </div>
                  <FieldCard label="id" value={skill.id} />
                  <FieldCard label="exam_play_url" value={skill.exam_play_url || '—'} />
                  <FieldCard label="audio_url" value={skill.audio_url || '—'} />
                  <FieldCard label="started_at" value={skill.started_at || '—'} />
                  <FieldCard label="expires_at" value={skill.expires_at || '—'} />
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'exam' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Exam UI Preview
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {playContent?.title} | {playContent?.skill} | {questions.length} questions | audioUrl: {audioUrl ? 'set' : 'not set'}
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-gray-500 mt-3">Loading exam content from S3...</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                    {activeSkillData?.exam_play_url?.slice(0, 80)}...
                  </p>
                </div>
              </div>
            ) : !playContent?.parts_html || playContent.parts_html.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <strong>No questions loaded.</strong> Check console for debug logs.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Part tabs */}
                <div className="flex gap-2">
                  {playContent.parts_html.map((p, tabIdx) => {
                    const qCount = (p.html.match(/name="(q-[\w-]+)"/gi) ?? []).length
                    return (
                      <button
                        key={p.part_index}
                        onClick={() => setSelectedPartIdx(tabIdx)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          tabIdx === selectedPartIdx
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Part {tabIdx + 1}
                        <span className="ml-1.5 text-xs opacity-70">{qCount}q</span>
                      </button>
                    )
                  })}
                </div>

                {/* Audio */}
                {audioUrl && skillType === 'listening' && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 mb-2 font-medium">Audio</p>
                    <p className="text-xs font-mono text-blue-500 break-all">{audioUrl}</p>
                  </div>
                )}

                {/* Full part HTML rendered */}
                {playContent.parts_html.map((p, tabIdx) => (
                  <div key={p.part_index} className={tabIdx !== selectedPartIdx ? 'hidden' : ''}>
                    <div className="text-xs text-gray-500 mb-2">Part {tabIdx + 1}</div>
                    <div
                      className="bg-white rounded-xl border shadow-sm p-6 prose max-w-none
                        [&_p]:my-2 [&_strong]:font-semibold [&_em]:italic
                        [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
                        [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_td]:border
                        [&_th]:bg-gray-100 [&_th]:p-2 [&_td]:p-2
                        [&_.exam-input-placeholder]:inline-block [&_.exam-input-placeholder]:bg-blue-50
                        [&_.exam-input-placeholder]:text-blue-700 [&_.exam-input-placeholder]:border
                        [&_.exam-input-placeholder]:border-blue-300 [&_.exam-input-placeholder]:px-2
                        [&_.exam-input-placeholder]:py-1 [&_.exam-input-placeholder]:rounded"
                      dangerouslySetInnerHTML={{ __html: p.html }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
