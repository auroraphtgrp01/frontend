import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { BandScoreSelector } from './BandScoreSelector'
import { FeedbackTemplates } from './FeedbackTemplates'
import { BandDescriptors } from './BandDescriptors'
import type { StudentAnswer, GradingSubmission } from '@/types/exam'
import { toast } from 'sonner'
import { Save, Send, HelpCircle } from 'lucide-react'

interface WritingGraderProps {
  queueItemId: string
  studentAnswer: StudentAnswer
  previousFeedback?: string
  onSubmit: (data: GradingSubmission) => void
  onSaveDraft?: (data: Partial<GradingSubmission>) => void
}

export function WritingGrader({
  queueItemId,
  studentAnswer,
  previousFeedback,
  onSubmit,
  onSaveDraft,
}: WritingGraderProps) {
  const [bandScore, setBandScore] = useState<number>(6)
  const [taskResponse, setTaskResponse] = useState<number>(6)
  const [coherence, setCoherence] = useState<number>(6)
  const [lexical, setLexical] = useState<number>(6)
  const [grammar, setGrammar] = useState<number>(6)
  const [feedback, setFeedback] = useState(previousFeedback || '')
  const [comments, setComments] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showDescriptors, setShowDescriptors] = useState(false)

  const handleInsertTemplate = (text: string) => {
    setFeedback((prev) => (prev ? `${prev}\n\n${text}` : text))
    setShowTemplates(false)
  }

  const handleSaveDraft = () => {
    const draft: Partial<GradingSubmission> = {
      queue_item_id: queueItemId,
      band_score: bandScore,
      task_response: taskResponse,
      coherence,
      lexical,
      grammar,
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
      task_response: taskResponse,
      coherence,
      lexical,
      grammar,
      feedback,
      comments,
      approved: true,
    }
    onSubmit(submission)
  }

  const wordCount = studentAnswer.text?.split(/\s+/).filter(Boolean).length || 0

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left Panel - Student Answer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Answer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Word Count */}
          <div className="flex items-center justify-between">
            <Badge variant={wordCount < 150 ? 'destructive' : wordCount < 250 ? 'warning' : 'success'}>
              {wordCount} words
              {wordCount < 150 && ' (Below minimum)'}
            </Badge>
            <span className="text-xs text-muted-foreground">Minimum: 150 words</span>
          </div>

          {/* Answer Text */}
          <div className="p-4 rounded-lg bg-muted/50 min-h-[400px] max-h-[500px] overflow-y-auto">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {studentAnswer.text || 'No answer provided'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Right Panel - Grading Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Grading Form</CardTitle>
            <div className="flex items-center gap-2">
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
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Band Score Selector */}
          <div className="space-y-4">
            <BandScoreSelector
              value={bandScore}
              onChange={setBandScore}
              skillType="writing"
            />
          </div>

          {/* Criteria Breakdown */}
          <div className="space-y-4 pt-4 border-t">
            <Label>Criteria Breakdown</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Task Response</Label>
                <div className="flex gap-1">
                  {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setTaskResponse(score)}
                      className={`w-8 h-8 text-sm rounded ${
                        taskResponse === score
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
                <Label className="text-xs text-muted-foreground">Coherence & Cohesion</Label>
                <div className="flex gap-1">
                  {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setCoherence(score)}
                      className={`w-8 h-8 text-sm rounded ${
                        coherence === score
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
            <BandDescriptors skillType="writing" />
          </div>
        </div>
      )}
    </div>
  )
}
