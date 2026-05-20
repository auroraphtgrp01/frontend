import { useMemo, useState } from 'react'

interface ReadingViewerProps {
  passage: string
  className?: string
  showWordCount?: boolean
}

// Detect if a string looks like HTML (contains HTML tags)
function looksLikeHTML(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text)
}

export function ReadingViewer({ passage, className = '', showWordCount = true }: ReadingViewerProps) {
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md')

  const fontSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const fontSizePx = {
    sm: '14px',
    md: '16px',
    lg: '18px',
  }

  const isHTML = useMemo(() => looksLikeHTML(passage), [passage])

  const wordCount = useMemo(() => {
    return passage
      .replace(/<[^>]*>/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
  }, [passage])

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      {showWordCount && (
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
      )}

      {/* Passage content */}
      {isHTML ? (
        /* HTML content: use prose styling */
        <div
          className={`prose prose-blue max-w-none leading-relaxed ${fontSizeClasses[fontSize]} [&_p]:text-justify [&_p]:mb-4 [&_p:first-child]:mt-0`}
          style={{ fontSize: fontSizePx[fontSize] }}
          dangerouslySetInnerHTML={{ __html: passage }}
        />
      ) : (
        /* Plain text: preserve whitespace and line breaks */
        <div
          className={`whitespace-pre-wrap leading-relaxed text-gray-800 ${fontSizeClasses[fontSize]}`}
          style={{ fontSize: fontSizePx[fontSize] }}
        >
          {passage}
        </div>
      )}
    </div>
  )
}
