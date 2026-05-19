import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, AlertCircle, BookOpen, MessageSquare } from 'lucide-react'

const feedbackTemplates = {
  positive: [
    { id: 'pos-1', text: 'Good use of vocabulary throughout the response.' },
    { id: 'pos-2', text: 'Clear and logical structure with effective paragraphing.' },
    { id: 'pos-3', text: 'Strong development of ideas with relevant examples.' },
    { id: 'pos-4', text: 'Excellent control of grammar and sentence structures.' },
    { id: 'pos-5', text: 'Coherent and cohesive writing that flows naturally.' },
    { id: 'pos-6', text: 'Demonstrates good fluency and confidence in speaking.' },
    { id: 'pos-7', text: 'Appropriate use of complex sentences and varied structures.' },
    { id: 'pos-8', text: 'Good pronunciation with clear articulation.' },
  ],
  improvement: [
    { id: 'imp-1', text: 'Work on paragraph coherence - ensure each paragraph has a clear central topic.' },
    { id: 'imp-2', text: 'Expand lexical range - try to use more sophisticated vocabulary.' },
    { id: 'imp-3', text: 'Focus on task response - ensure all parts of the question are addressed.' },
    { id: 'imp-4', text: 'Improve cohesion by using more linking words and phrases.' },
    { id: 'imp-5', text: 'Work on fluency - try to speak more continuously without hesitations.' },
    { id: 'imp-6', text: 'Pay attention to word forms - ensure consistency throughout.' },
    { id: 'imp-7', text: 'Practice using a wider range of grammatical structures.' },
    { id: 'imp-8', text: 'Review spelling and punctuation - some errors identified.' },
  ],
  grammar: [
    { id: 'grm-1', text: 'Subject-verb agreement needs attention.' },
    { id: 'grm-2', text: 'Article usage should be reviewed (a, an, the).' },
    { id: 'grm-3', text: 'Consider using more complex sentence structures.' },
    { id: 'grm-4', text: 'Tense consistency - ensure consistent use of past/present.' },
    { id: 'grm-5', text: 'Word order in questions needs review.' },
    { id: 'grm-6', text: 'Preposition usage could be improved.' },
    { id: 'grm-7', text: 'Sentence fragments - ensure all sentences are complete.' },
    { id: 'grm-8', text: 'Punctuation errors identified - review comma usage.' },
  ],
  vocabulary: [
    { id: 'voc-1', text: 'Good range of topic-related vocabulary demonstrated.' },
    { id: 'voc-2', text: 'Expand collocation knowledge - practice common word combinations.' },
    { id: 'voc-3', text: 'Work on paraphrasing skills - avoid repetition.' },
    { id: 'voc-4', text: 'Consider using more idiomatic expressions appropriately.' },
    { id: 'voc-5', text: 'Pay attention to word formation from root words.' },
    { id: 'voc-6', text: 'Practice using more precise/technical vocabulary.' },
    { id: 'voc-7', text: 'Avoid over-reliance on basic vocabulary.' },
    { id: 'voc-8', text: 'Use more sophisticated synonyms for common words.' },
  ],
}

interface FeedbackTemplatesProps {
  onInsert: (text: string) => void
  skillType?: 'writing' | 'speaking'
}

export function FeedbackTemplates({ onInsert, skillType: _skillType = 'writing' }: FeedbackTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTemplates = Object.entries(feedbackTemplates).reduce((acc, [category, templates]) => {
    acc[category as keyof typeof feedbackTemplates] = templates.filter((t) =>
      t.text.toLowerCase().includes(searchQuery.toLowerCase())
    )
    return acc
  }, {} as typeof feedbackTemplates)

  const categories = [
    { key: 'positive', label: 'Positive', icon: Sparkles, color: 'text-green-600' },
    { key: 'improvement', label: 'Improvement', icon: AlertCircle, color: 'text-orange-600' },
    { key: 'grammar', label: 'Grammar', icon: BookOpen, color: 'text-blue-600' },
    { key: 'vocabulary', label: 'Vocabulary', icon: MessageSquare, color: 'text-purple-600' },
  ]

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search templates..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-3 py-2 text-sm border rounded-md bg-background"
      />

      <Tabs defaultValue="positive">
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((cat) => (
            <TabsTrigger key={cat.key} value={cat.key} className="text-xs">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.key} value={cat.key} className="space-y-2">
            {filteredTemplates[cat.key as keyof typeof filteredTemplates].length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No templates found
              </p>
            ) : (
              filteredTemplates[cat.key as keyof typeof filteredTemplates].map((template) => (
                <button
                  key={template.id}
                  onClick={() => onInsert(template.text)}
                  className="w-full text-left p-2 rounded-lg border hover:bg-muted/50 transition-colors text-sm"
                >
                  {template.text}
                </button>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
