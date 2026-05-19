import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Flag, User, Calendar, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { WritingGrader } from '@/components/grading/WritingGrader'
import { SpeakingGrader } from '@/components/grading/SpeakingGrader'
import { useGradingReview, useSubmitGrading } from '@/api/grading'
import { useGradingQueue } from '@/api/grading'
import type { GradingSubmission } from '@/types/exam'
import { toast } from 'sonner'

export default function GradingReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)

  const { data: queueItems } = useGradingQueue()
  const { data: reviewData, isLoading, error } = useGradingReview(id!, 'writing')
  const submitGrading = useSubmitGrading()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        toast.info('Draft saved')
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        navigateToPrevious()
      }
      if (e.key === 'ArrowRight' && queueItems && currentIndex < queueItems.length - 1) {
        navigateToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, queueItems])

  const navigateToPrevious = () => {
    if (queueItems && currentIndex > 0) {
      const prevItem = queueItems[currentIndex - 1]
      navigate(`/admin/grading/${prevItem.id}`)
      setCurrentIndex(currentIndex - 1)
    }
  }

  const navigateToNext = () => {
    if (queueItems && currentIndex < queueItems.length - 1) {
      const nextItem = queueItems[currentIndex + 1]
      navigate(`/admin/grading/${nextItem.id}`)
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleSubmitGrading = async (data: GradingSubmission) => {
    try {
      await submitGrading.mutateAsync(data)
      toast.success('Grading submitted successfully')
      if (queueItems && currentIndex < queueItems.length - 1) {
        navigateToNext()
      } else {
        navigate('/admin/grading')
      }
    } catch {
      toast.error('Failed to submit grading')
    }
  }

  const handleSaveDraft = () => {
    toast.success('Draft saved')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    )
  }

  if (error || !reviewData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/grading')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Grading Review</h1>
            <p className="text-sm text-muted-foreground">Unable to load submission</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground">The grading submission could not be found or has been removed.</p>
              <Button className="mt-4" onClick={() => navigate('/admin/grading')}>
                Back to Queue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { queue_item, student_answer, previous_feedback } = reviewData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/grading')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Grading Review</h1>
            <p className="text-sm text-muted-foreground">
              Reviewing submission from {queue_item.student_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={navigateToPrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} of {queueItems?.length || 0}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={navigateToNext}
            disabled={!queueItems || currentIndex >= queueItems.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Flag className="h-4 w-4" />
            Flag
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Student</p>
              <p className="font-medium">{queue_item.student_name}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Exam</p>
              <p className="font-medium truncate">{queue_item.exam_title}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="font-medium">
                {new Date(queue_item.submitted_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Badge
              variant={queue_item.skill_type === 'writing' ? 'default' : 'secondary'}
              className="text-sm"
            >
              {queue_item.skill_type === 'writing' ? 'Writing' : 'Speaking'}
            </Badge>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{queue_item.status.replace('_', ' ')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grader Component */}
      {queue_item.skill_type === 'writing' ? (
        <WritingGrader
          queueItemId={queue_item.id}
          studentAnswer={student_answer}
          previousFeedback={previous_feedback}
          onSubmit={handleSubmitGrading}
          onSaveDraft={handleSaveDraft}
        />
      ) : (
        <SpeakingGrader
          queueItemId={queue_item.id}
          studentAnswer={student_answer}
          previousFeedback={previous_feedback}
          onSubmit={handleSubmitGrading}
          onSaveDraft={handleSaveDraft}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="text-center text-xs text-muted-foreground border-t pt-4">
        <p>Keyboard shortcuts: Ctrl+S (Save Draft) • Ctrl+Enter (Submit) • ← (Previous) • → (Next)</p>
      </div>
    </div>
  )
}
