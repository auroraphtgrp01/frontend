import { cn } from '@/lib/utils'
import type { SkillType } from '@/types/exam'

interface BandScoreSelectorProps {
  value: number
  onChange: (score: number) => void
  skillType?: SkillType
  disabled?: boolean
}

const bandDescriptors = {
  9: 'Expert User',
  8: 'Very Good User',
  7: 'Good User',
  6: 'Competent User',
  5: 'Modest User',
  4: 'Limited User',
  3: 'Extremely Limited',
  2: 'Intermittent User',
  1: 'Non User',
}

const writingCriteria = ['Task Response', 'Coherence & Cohesion', 'Lexical Resource', 'Grammatical Range']
const speakingCriteria = ['Fluency & Coherence', 'Lexical Resource', 'Grammatical Range', 'Pronunciation']

export function BandScoreSelector({ value, onChange, skillType = 'writing', disabled = false }: BandScoreSelectorProps) {
  const criteria = skillType === 'speaking' ? speakingCriteria : writingCriteria

  const getBandColor = (band: number) => {
    if (band >= 7) return 'bg-green-500 text-white hover:bg-green-600'
    if (band >= 5) return 'bg-yellow-500 text-white hover:bg-yellow-600'
    return 'bg-red-500 text-white hover:bg-red-600'
  }

  return (
    <div className="space-y-4">
      {/* Band Score Picker */}
      <div>
        <label className="text-sm font-medium mb-2 block">Band Score (Overall)</label>
        <div className="flex gap-1">
          {[9, 8, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1].map((band) => (
            <button
              key={band}
              type="button"
              onClick={() => !disabled && onChange(band)}
              disabled={disabled}
              className={cn(
                'w-9 h-9 text-sm font-medium rounded transition-colors',
                value === band
                  ? cn(getBandColor(band), 'ring-2 ring-offset-2 ring-primary')
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground',
              )}
            >
              {band}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {bandDescriptors[value as keyof typeof bandDescriptors] || 'Select a score'}
        </p>
      </div>

      {/* Criteria Scores */}
      <div className="space-y-3 pt-4 border-t">
        <label className="text-sm font-medium">Criteria Breakdown</label>
        {criteria.map((criterion) => (
          <div key={criterion} className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground w-40">{criterion}</span>
            <div className="flex gap-1">
              {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => !disabled && onChange(score)}
                  disabled={disabled}
                  className={cn(
                    'w-7 h-7 text-xs font-medium rounded transition-colors',
                    value === score
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground',
                  )}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
