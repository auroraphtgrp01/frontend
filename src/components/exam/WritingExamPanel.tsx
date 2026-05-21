import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WritingEditor } from '@/components/exam/WritingEditor'
import type { ExamContentBody } from '@/api/trialExam'

// ============================================================
// Types
// ============================================================

interface WritingExamPanelProps {
  content: ExamContentBody
  essayText: string
  onEssayChange: (text: string) => void
  disabled?: boolean
}

// ============================================================
// Writing Exam Panel
// ============================================================

export default function WritingExamPanel({
  content,
  essayText,
  onEssayChange,
  disabled = false,
}: WritingExamPanelProps) {
  const REQUIRED_MIN_WORDS = 150
  const RECOMMENDED_MAX_WORDS = 350

  const wordCount = useMemo(() => {
    const trimmed = essayText.trim()
    if (!trimmed) return 0
    return trimmed.split(/\s+/).filter(Boolean).length
  }, [essayText])

  const wordCountStatus = useMemo(() => {
    if (wordCount === 0) return 'empty'
    if (wordCount < REQUIRED_MIN_WORDS) return 'too_few'
    if (wordCount > RECOMMENDED_MAX_WORDS * 1.5) return 'too_many'
    return 'ok'
  }, [wordCount])

  const wordCountColor = useMemo(() => {
    switch (wordCountStatus) {
      case 'empty': return 'text-muted-foreground'
      case 'too_few': return 'text-amber-600'
      case 'too_many': return 'text-red-600'
      default: return 'text-green-600'
    }
  }, [wordCountStatus])

  const wordCountBg = useMemo(() => {
    switch (wordCountStatus) {
      case 'empty': return 'bg-muted'
      case 'too_few': return 'bg-amber-50 border-amber-200'
      case 'too_many': return 'bg-red-50 border-red-200'
      default: return 'bg-green-50 border-green-200'
    }
  }, [wordCountStatus])

  return (
    <div className="space-y-6">
      {/* Header with title */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{content.title || 'Writing Task'}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Prompt */}
          {content.prompt && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-medium text-blue-900 mb-1">Task</p>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">
                {content.prompt}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor with word count */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Your Response</CardTitle>
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-sm ${wordCountBg}`}
            >
              <span className={`font-semibold ${wordCountColor}`}>{wordCount}</span>
              <span className="text-muted-foreground">/ {REQUIRED_MIN_WORDS}+ words</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <WritingEditor
            value={essayText}
            onChange={onEssayChange}
            disabled={disabled}
            placeholder="Type your essay here..."
            minWords={REQUIRED_MIN_WORDS}
            maxWords={RECOMMENDED_MAX_WORDS * 2}
          />

          {/* Status messages */}
          {wordCountStatus === 'too_few' && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              At least {REQUIRED_MIN_WORDS - wordCount} more words required to meet the minimum.
            </p>
          )}
          {wordCountStatus === 'too_many' && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Your response is quite long. Consider organizing your thoughts more concisely.
            </p>
          )}

          {/* Tips */}
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-800">
              <strong>Tips:</strong> Aim for {REQUIRED_MIN_WORDS}-{RECOMMENDED_MAX_WORDS} words.
              Focus on task achievement, coherence and cohesion, lexical resource, and grammatical range and accuracy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
