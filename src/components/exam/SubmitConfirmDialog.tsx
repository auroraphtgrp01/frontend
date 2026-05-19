import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'

interface SubmitConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unansweredCount: number
  onConfirm: () => void
  skillName?: string
}

export function SubmitConfirmDialog({
  open,
  onOpenChange,
  unansweredCount,
  onConfirm,
  skillName = 'this skill',
}: SubmitConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit {skillName}?</DialogTitle>
          <DialogDescription>
            {unansweredCount > 0 ? (
              <span className="text-amber-600">
                You have <strong>{unansweredCount} unanswered</strong> question{unansweredCount > 1 ? 's' : ''}. Once submitted, you cannot change your answers.
              </span>
            ) : (
              'Are you sure you want to submit? You cannot change your answers after submission.'
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Review Answers
          </Button>
          <Button variant="default" onClick={handleConfirm}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
