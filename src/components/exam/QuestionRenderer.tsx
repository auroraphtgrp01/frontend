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
  // Filter out options with empty text
  const validOptions = useMemo(() => {
    if (!question.options) return []
    return question.options.filter((opt) => opt.text && opt.text.trim() !== '')
  }, [question.options])

  const renderMultipleChoice = () => {
    if (validOptions.length === 0) return null

    return (
      <div className="space-y-2 mt-3">
        {validOptions.map((opt, i) => {
          const letter = String.fromCharCode(65 + i)
          const isSelected = answer === opt.id || answer === letter
          return (
            <label
              key={opt.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                value={opt.id}
                checked={isSelected}
                onChange={() => !disabled && onChange(opt.id)}
                disabled={disabled}
                className="sr-only"
              />
              <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {letter}
              </span>
              <span className="text-sm text-gray-800">{opt.text}</span>
            </label>
          )
        })}
      </div>
    )
  }

  const renderTrueFalse = () => {
    // Use options from question if available (parsed from HTML)
    if (validOptions.length > 0) {
      return (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {validOptions.map((opt) => {
            const isSelected = answer === opt.id || answer === opt.text
            return (
              <label
                key={opt.id}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 cursor-pointer transition-all font-medium text-sm ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={opt.id}
                  checked={isSelected}
                  onChange={() => !disabled && onChange(opt.id)}
                  disabled={disabled}
                  className="sr-only"
                />
                <span>{opt.text}</span>
              </label>
            )
          })}
        </div>
      )
    }

    // Fallback to hardcoded True/False options
    return (
      <div className="grid grid-cols-2 gap-2 mt-3">
        {(['True', 'False'] as const).map((opt) => {
          const isSelected = answer === opt
          return (
            <label
              key={opt}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 cursor-pointer transition-all font-medium text-sm ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                value={opt}
                checked={isSelected}
                onChange={() => !disabled && onChange(opt)}
                disabled={disabled}
                className="sr-only"
              />
              <span>{opt}</span>
            </label>
          )
        })}
      </div>
    )
  }

  const renderFillBlank = () => (
    <div className="mt-3">
      <input
        type="text"
        value={(answer as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer..."
        className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
        aria-label="Fill in the blank"
      />
    </div>
  )

  const renderShortAnswer = () => (
    <div className="mt-3">
      <input
        type="text"
        value={(answer as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer..."
        className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
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

  const renderYesNo = () => (
    <div className="flex gap-3">
      {(['Yes', 'No'] as const).map((opt) => {
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

  const renderDragDrop = () => {
    const selectedAnswer = (answer as string) || ''
    return (
      <div className="space-y-3">
        <select
          value={selectedAnswer}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 bg-white"
          aria-label="Select answer"
        >
          <option value="">Select an answer...</option>
          {question.options?.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.text}
            </option>
          ))}
        </select>
        {question.options && question.options.length > 0 && (
          <div className="p-3 bg-gray-50 rounded-lg border">
            <p className="text-xs text-gray-500 mb-2 font-medium">Available options:</p>
            <div className="flex flex-wrap gap-2">
              {question.options.map((opt) => (
                <span
                  key={opt.id}
                  className={`px-2 py-1 text-xs rounded ${
                    selectedAnswer === opt.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {opt.text}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderParagraphMatching = () => {
    const selectedAnswer = (answer as string) || ''
    return (
      <div className="space-y-3">
        <select
          value={selectedAnswer}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 bg-white"
          aria-label="Select paragraph"
        >
          <option value="">Select a paragraph (A-H)...</option>
          {question.options?.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.id}: {opt.text}
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
      case 'yes_no':
        return renderYesNo()
      case 'fill_blank':
        return renderFillBlank()
      case 'short_answer':
        return renderShortAnswer()
      case 'matching':
        return renderMatching()
      case 'drag_drop':
      case 'select':
        return renderDragDrop()
      case 'paragraph_matching':
        return renderParagraphMatching()
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
    <div className={`p-4 bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
          {questionNumber}
        </span>
        <div className="flex-1 min-w-0">
          {htmlContent ? (
            <div
              className="prose prose-sm max-w-none text-gray-800 [&_p]:my-1 [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_td]:border [&_th]:bg-gray-50 [&_th]:p-1.5 [&_td]:p-1.5 [&_br]:hidden"
              dangerouslySetInnerHTML={htmlContent}
            />
          ) : (
            <p className="text-sm font-medium text-gray-900 leading-relaxed">{question.text}</p>
          )}
          {question.audio_url && (
            <audio
              src={question.audio_url}
              controls
              className="mt-2 h-8 w-full max-w-xs"
            />
          )}
        </div>
      </div>
      {renderContent()}
    </div>
  )
}
