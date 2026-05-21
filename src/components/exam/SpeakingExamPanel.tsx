import { useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SpeakingRecorder } from '@/components/exam/SpeakingRecorder'
import { CheckCircle, AlertCircle } from 'lucide-react'
import type { ExamContentBody } from '@/api/trialExam'

// ============================================================
// Types
// ============================================================

interface SpeakingExamPanelProps {
  content: ExamContentBody
  audioBlob: { blob: Blob; duration: number } | null
  onRecordingComplete: (blob: Blob, duration: number) => void
  disabled?: boolean
}

// ============================================================
// Speaking Exam Panel
// ============================================================

export default function SpeakingExamPanel({
  content,
  audioBlob,
  onRecordingComplete,
  disabled = false,
}: SpeakingExamPanelProps) {
  const audioUrl = useMemo(
    () => (audioBlob ? URL.createObjectURL(audioBlob.blob) : null),
    [audioBlob]
  )

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{content.title || 'Speaking Task'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Audio prompt */}
          {content.media_url && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Audio Prompt</p>
              <audio
                src={content.media_url}
                controls
                className="w-full h-12 rounded border bg-gray-50"
              />
            </div>
          )}

          {/* Text prompt */}
          {content.prompt && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-medium text-blue-900 mb-1">Task</p>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">
                {content.prompt}
              </p>
            </div>
          )}

          {/* Recorded audio playback */}
          {audioBlob && audioUrl && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-100 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-green-800">Recording saved</p>
                  <span className="text-xs text-green-600 font-mono">
                    {formatDuration(audioBlob.duration)}
                  </span>
                </div>
                <audio
                  src={audioUrl}
                  controls
                  className="w-full h-10 mt-2"
                />
              </div>
            </div>
          )}

          {/* Tips */}
          {!audioBlob && !disabled && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-xs text-amber-800">
                <strong>Tips:</strong> Speak clearly and naturally. You can re-record up to 3 times.
                Your last recording will be submitted.
              </p>
            </div>
          )}

          {/* Recorder */}
          {!disabled && (
            <SpeakingRecorder
              onRecordingComplete={onRecordingComplete}
              maxDuration={120}
              maxRetries={3}
            />
          )}

          {/* Session ended, no recording */}
          {disabled && !audioBlob && (
            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <AlertCircle className="h-5 w-5 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-600">
                Session has ended. No recording was made.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
