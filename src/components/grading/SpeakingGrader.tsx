import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { BandScoreSelector } from './BandScoreSelector'
import { FeedbackTemplates } from './FeedbackTemplates'
import { BandDescriptors } from './BandDescriptors'
import type { StudentAnswer, RecordingPart, GradingSubmission } from '@/types/exam'
import { toast } from 'sonner'
import { Volume2, HelpCircle, Save, Send } from 'lucide-react'

interface SpeakingGraderProps {
  queueItemId: string
  studentAnswer: StudentAnswer
  previousFeedback?: string
  onSubmit: (data: GradingSubmission) => void
  onSaveDraft?: (data: Partial<GradingSubmission>) => void
}

export function SpeakingGrader({
  queueItemId,
  studentAnswer,
  previousFeedback,
  onSubmit,
  onSaveDraft,
}: SpeakingGraderProps) {
  const [bandScore, setBandScore] = useState<number>(6)
  const [fluency, setFluency] = useState<number>(6)
  const [lexical, setLexical] = useState<number>(6)
  const [grammar, setGrammar] = useState<number>(6)
  const [pronunciation, setPronunciation] = useState<number>(6)
  const [feedback, setFeedback] = useState(previousFeedback || '')
  const [comments, setComments] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showDescriptors, setShowDescriptors] = useState(false)

  const recordingParts = studentAnswer.recording_parts || []

  const handleInsertTemplate = (text: string) => {
    setFeedback((prev) => (prev ? `${prev}\n\n${text}` : text))
    setShowTemplates(false)
  }

  const handleSaveDraft = () => {
    const draft: Partial<GradingSubmission> = {
      queue_item_id: queueItemId,
      band_score: bandScore,
      fluency,
      lexical,
      grammar,
      pronunciation,
      feedback,
      comments,
      approved: false,
    }
    onSaveDraft?.(draft)
    toast.success('Draft saved')
  }

  const handleSubmit = () => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback before submitting')
      return
    }
    const submission: GradingSubmission = {
      queue_item_id: queueItemId,
      band_score: bandScore,
      fluency,
      lexical,
      grammar,
      pronunciation,
      feedback,
      comments,
      approved: true,
    }
    onSubmit(submission)
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left Panel - Audio Playback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Recording</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {recordingParts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Volume2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No audio recordings available</p>
              {studentAnswer.audio_url && (
                <p className="text-sm mt-2">Audio URL: {studentAnswer.audio_url}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {recordingParts.map((part: RecordingPart) => (
                <div key={part.part} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">Part {part.part}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {Math.floor(part.duration_seconds / 60)}:{(part.duration_seconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <audio controls className="w-full">
                    <source src={part.audio_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ))}
            </div>
          )}

          {/* AI Preliminary Score (if available) */}
          <div className="border-t pt-4">
            <Label className="text-muted-foreground">AI Preliminary Analysis</Label>
            <div className="mt-2 p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                AI scoring not yet available. Manual evaluation required.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right Panel - Grading Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Grading Form</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDescriptors(true)}
              className="gap-1"
            >
              <HelpCircle className="h-4 w-4" />
              Descriptors
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Band Score Selector */}
          <BandScoreSelector
            value={bandScore}
            onChange={setBandScore}
            skillType="speaking"
          />

          {/* Criteria Breakdown */}
          <div className="space-y-4 pt-4 border-t">
            <Label>Criteria Breakdown</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Fluency & Coherence</Label>
                <div className="flex gap-1">
                  {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setFluency(score)}
                      className={`w-8 h-8 text-sm rounded ${
                        fluency === score
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Lexical Resource</Label>
                <div className="flex gap-1">
                  {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setLexical(score)}
                      className={`w-8 h-8 text-sm rounded ${
                        lexical === score
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Grammatical Range</Label>
                <div className="flex gap-1">
                  {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setGrammar(score)}
                      className={`w-8 h-8 text-sm rounded ${
                        grammar === score
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Pronunciation</Label>
                <div className="flex gap-1">
                  {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setPronunciation(score)}
                      className={`w-8 h-8 text-sm rounded ${
                        pronunciation === score
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label>Feedback for Student</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
              >
                Use Template
              </Button>
            </div>
            {showTemplates && (
              <div className="mb-3">
                <FeedbackTemplates onInsert={handleInsertTemplate} />
              </div>
            )}
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter constructive feedback for the student..."
              rows={6}
            />
          </div>

          {/* Comments (Internal) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Internal Comments (Not visible to student)</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add internal notes about this submission..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleSaveDraft} className="gap-2">
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <Button onClick={handleSubmit} className="gap-2">
              <Send className="h-4 w-4" />
              Approve & Submit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Band Descriptors Modal */}
      {showDescriptors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
            <BandDescriptors skillType="speaking" />
          </div>
        </div>
      )}
    </div>
  )
}
