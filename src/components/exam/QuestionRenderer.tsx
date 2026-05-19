import { useMemo } from 'react'
import type { Question } from '@/types/exam'

interface QuestionRendererProps {
  question: Question
  questionNumber: number
  answer: string | string[] | null
  onChange: (answer: string | string[] | null) => void
  disabled?: boolean
  className?: string
}

export function QuestionRenderer({
  question,
  questionNumber,
  answer,
  onChange,
  disabled = false,
  className = '',
}: QuestionRendererProps) {
  const renderMultipleChoice = () => (
    <div className="space-y-2">
      {question.options?.map((opt, i) => {
        const letter = String.fromCharCode(65 + i)
        const isSelected = answer === opt.id || answer === letter
        return (
          <label
            key={opt.id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              value={opt.id}
              checked={isSelected}
              onChange={() => !disabled && onChange(opt.id)}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 accent-blue-600"
            />
            <span className="w-6 h-6 rounded-full bg-gray-200 text-xs font-bold flex items-center justify-center shrink-0">
              {letter}
            </span>
            <span className="text-sm text-gray-800">{opt.text}</span>
          </label>
        )
      })}
    </div>
  )

  const renderTrueFalse = () => (
    <div className="flex gap-3">
      {(['True', 'False'] as const).map((opt) => {
        const isSelected = answer === opt
        return (
          <label
            key={opt}
            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors ${
              isSelected
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              value={opt}
              checked={isSelected}
              onChange={() => !disabled && onChange(opt)}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 accent-blue-600"
            />
            <span className="font-medium text-sm">{opt}</span>
          </label>
        )
      })}
    </div>
  )

  const renderFillBlank = () => (
    <div>
      <input
        type="text"
        value={(answer as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer..."
        className="w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        aria-label="Fill in the blank"
      />
    </div>
  )

  const renderShortAnswer = () => (
    <div>
      <input
        type="text"
        value={(answer as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer..."
        className="w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        aria-label="Short answer"
      />
    </div>
  )

  const renderMatching = () => {
    const selectedAnswer = (answer as string) || ''
    return (
      <div className="flex items-center gap-3">
        <select
          value={selectedAnswer}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          aria-label="Select matching option"
        >
          <option value="">Select...</option>
          {question.options?.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.text}
            </option>
          ))}
        </select>
      </div>
    )
  }

  const renderDiagram = () => (
    <div className="flex flex-col gap-3">
      {question.image_url && (
        <img
          src={question.image_url}
          alt="Diagram"
          className="max-w-full rounded-lg border"
        />
      )}
      <input
        type="text"
        value={(answer as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Label or answer..."
        className="w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        aria-label="Diagram label"
      />
    </div>
  )

  const renderEssay = () => (
    <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border">
      {question.text}
    </div>
  )

  const renderSpeaking = () => (
    <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-100">
      {question.text}
    </div>
  )

  const renderContent = () => {
    switch (question.type) {
      case 'multiple_choice':
        return renderMultipleChoice()
      case 'true_false':
        return renderTrueFalse()
      case 'fill_blank':
        return renderFillBlank()
      case 'short_answer':
        return renderShortAnswer()
      case 'matching':
        return renderMatching()
      case 'diagram':
        return renderDiagram()
      case 'essay':
        return renderEssay()
      case 'speaking':
        return renderSpeaking()
      default:
        return (
          <div className="text-sm text-gray-500">
            Unknown question type: {question.type}
          </div>
        )
    }
  }

  const htmlContent = useMemo(() => {
    if (!question.html) return null
    return { __html: question.html }
  }, [question.html])

  return (
    <div className={`p-5 bg-white rounded-xl border shadow-sm ${className}`}>
      <div className="flex items-start gap-3 mb-4">
        <span className="shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center">
          {questionNumber}
        </span>
        <div className="flex-1">
          {htmlContent ? (
            <div
              className="prose prose-sm max-w-none text-gray-800 [&_p]:my-1 [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_td]:border [&_th]:bg-gray-50 [&_th]:p-1.5 [&_td]:p-1.5 [&_br]:hidden"
              dangerouslySetInnerHTML={htmlContent}
            />
          ) : (
            <p className="text-sm font-medium text-gray-800">{question.text}</p>
          )}
          {question.audio_url && (
            <audio
              src={question.audio_url}
              controls
              className="mt-2 h-8 w-full max-w-xs"
            />
          )}
          {question.passage && !question.html && (
            <div className="mt-2 p-3 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-100">
              <strong>Passage:</strong> {question.passage.substring(0, 200)}
              {question.passage.length > 200 && '...'}
            </div>
          )}
        </div>
      </div>
      {renderContent()}
    </div>
  )
}
