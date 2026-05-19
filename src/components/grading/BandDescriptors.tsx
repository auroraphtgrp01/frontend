import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const bandDescriptors = {
  9: {
    score: '9',
    title: 'Expert User',
    description: 'Has full command of the language: appropriate, accurate and fluent with complete understanding.',
    criteria: {
      writing: [
        'Fully appropriate, accurate and fluent',
        'Uses wide range of structures with complete flexibility',
        'Precise use of wide range of vocabulary',
        'Only minor unsystematic inaccuracies may occur',
      ],
      speaking: [
        'Uses wide range of functions flexibly and with ease',
        'High degree of fluency and flexibility',
        'Conveys precise shades of meaning',
        'Rarely searches for words',
      ],
    },
  },
  8: {
    score: '8',
    title: 'Very Good User',
    description: 'Has fully operational command of the language with only occasional inaccuracies.',
    criteria: {
      writing: [
        'Fluent, flexible and precise',
        'Wide range of structures',
        'Good range of vocabulary',
        'Generally well structured',
        'Minor inaccuracies may occur',
      ],
      speaking: [
        'Fluent and flexible',
        'Good range of vocabulary',
        'Can discuss complex topics',
        'Rarely searches for words',
      ],
    },
  },
  7: {
    score: '7',
    title: 'Good User',
    description: 'Has operational command of the language, though with occasional inaccuracies and misunderstandings.',
    criteria: {
      writing: [
        'Carries out task with clear progression',
        'Uses cohesive devices successfully',
        'Range of vocabulary for precise meaning',
        'Mostly error-free sentences',
      ],
      speaking: [
        'Maintains flow of speech',
        'Uses range of vocabulary meaningfully',
        'Generally good grammar control',
        'Some hesitation but fillers rarely obtrusive',
      ],
    },
  },
  6: {
    score: '6',
    title: 'Competent User',
    description: 'Has effective command of the language despite some inaccuracies and misunderstandings.',
    criteria: {
      writing: [
        'Task completed with some relevant extension',
        'Generally coherent and cohesive',
        'Sufficient range of vocabulary',
        'Errors do not impede communication',
      ],
      speaking: [
        'Speaks with no long hesitations',
        'Uses appropriate vocabulary',
        'Errors do not prevent communication',
        'Pronunciation generally intelligible',
      ],
    },
  },
  5: {
    score: '5',
    title: 'Modest User',
    description: 'Has partial command of the language, coping with overall meaning in most situations.',
    criteria: {
      writing: [
        'Task mostly addressed but format may be inadequate',
        'Limited cohesion in longer discourse',
        'Limited range of vocabulary',
        'Errors cause strain for reader',
      ],
      speaking: [
        'Manages to talk continuously',
        'Needs to repeat and make changes',
        'Pronunciation problems cause difficulties',
        'Some words may impede communication',
      ],
    },
  },
  4: {
    score: '4',
    title: 'Limited User',
    description: 'Basic competence is limited to familiar situations with frequent problems in understanding and expression.',
    criteria: {
      writing: [
        'Task attempted but not fully addressed',
        'Limited control of cohesive devices',
        'Limited range of vocabulary',
        'Frequent errors cause misunderstanding',
      ],
      speaking: [
        'Cannot sustain coherent speech',
        'Needs to pause frequently',
        'Pronunciation causes strain',
        'Vocabulary range narrow',
      ],
    },
  },
}

interface BandDescriptorsProps {
  skillType?: 'writing' | 'speaking'
  compact?: boolean
}

export function BandDescriptors({ skillType = 'writing', compact = false }: BandDescriptorsProps) {
  const [expandedBands, setExpandedBands] = useState<number[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const toggleBand = (band: number) => {
    setExpandedBands((prev) =>
      prev.includes(band) ? prev.filter((b) => b !== band) : [...prev, band]
    )
  }

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <HelpCircle className="h-4 w-4" />
        Band Descriptors
      </Button>
    )
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <HelpCircle className="h-4 w-4" />
        View Band Descriptors
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>IELTS Band Descriptors</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <div className="space-y-3">
                {[9, 8, 7, 6, 5, 4].map((band) => {
                  const descriptor = bandDescriptors[band as keyof typeof bandDescriptors]
                  const isExpanded = expandedBands.includes(band)
                  const criteria = skillType === 'speaking' ? descriptor.criteria.speaking : descriptor.criteria.writing

                  return (
                    <div key={band} className="border rounded-lg">
                      <button
                        onClick={() => toggleBand(band)}
                        className="w-full flex items-center justify-between p-3 text-left"
                      >
                        <div>
                          <span className="font-bold text-lg">Band {descriptor.score}</span>
                          <span className="ml-2 text-muted-foreground">{descriptor.title}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t pt-3">
                          <p className="text-sm text-muted-foreground mb-3">
                            {descriptor.description}
                          </p>
                          <ul className="space-y-1.5">
                            {criteria.map((criterion, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-primary mt-0.5">•</span>
                                <span>{criterion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
