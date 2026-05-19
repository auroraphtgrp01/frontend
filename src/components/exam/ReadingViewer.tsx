import { useState } from 'react'

interface ReadingViewerProps {
  passage: string
  className?: string
}

export function ReadingViewer({ passage, className = '' }: ReadingViewerProps) {
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md')

  const fontSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const wordCount = passage
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b">
        <span className="text-sm text-gray-500">
          {wordCount.toLocaleString()} words
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-2">Font size:</span>
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                fontSize === size
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {size === 'sm' ? 'S' : size === 'md' ? 'M' : 'L'}
            </button>
          ))}
        </div>
      </div>

      {/* Passage content */}
      <div
        className={`prose prose-blue max-w-none leading-relaxed ${fontSizeClasses[fontSize]} ${className}`}
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {passage.split('\n\n').map((paragraph, i) => (
          <p key={i} className="mb-4 text-gray-800">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  )
}
