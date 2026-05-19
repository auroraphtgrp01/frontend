import { useRef, useEffect, useState } from 'react'

interface WritingEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minWords?: number
  maxWords?: number
  disabled?: boolean
  className?: string
}

export function WritingEditor({
  value,
  onChange,
  placeholder = 'Start writing your answer...',
  minWords = 0,
  maxWords = 1000,
  disabled = false,
  className = '',
}: WritingEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [wordCount, setWordCount] = useState(0)

  useEffect(() => {
    const words = value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    setWordCount(words.length)
  }, [value])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const autoResize = () => {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }

    textarea.addEventListener('input', autoResize)
    autoResize()
    return () => textarea.removeEventListener('input', autoResize)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + '\t' + value.substring(end)
      onChange(newValue)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1
      })
    }
  }

  const isUnderMin = minWords > 0 && wordCount < minWords
  const isOverMax = maxWords > 0 && wordCount > maxWords

  return (
    <div className={`flex flex-col ${className}`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full min-h-64 p-4 text-base font-serif leading-relaxed border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        style={{ fontFamily: "'Georgia', serif" }}
        aria-label="Writing answer"
      />

      {/* Word count bar */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isUnderMin ? 'text-amber-600' : 'text-gray-500'}`}>
            {wordCount.toLocaleString()} words
          </span>
          {minWords > 0 && (
            <span className="text-xs text-gray-400">
              (min {minWords})
            </span>
          )}
          {maxWords > 0 && (
            <span className="text-xs text-gray-400">
              / {maxWords}
            </span>
          )}
        </div>

        {isOverMax && (
          <span className="text-xs text-red-500 font-medium">
            Over limit by {wordCount - maxWords} words
          </span>
        )}

        {isUnderMin && !isOverMax && (
          <span className="text-xs text-amber-500 font-medium">
            {minWords - wordCount} more words recommended
          </span>
        )}

        {!isUnderMin && !isOverMax && wordCount > 0 && (
          <span className="text-xs text-green-600 font-medium">
            Good length
          </span>
        )}
      </div>
    </div>
  )
}
