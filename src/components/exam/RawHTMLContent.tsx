import { useEffect, useRef } from 'react'

interface RawHTMLContentProps {
  html: string
  answers: Record<string, string | string[] | null>
  onChange: (answers: Record<string, string | string[] | null>) => void
  disabled?: boolean
}

// "q-20-21" -> { "q-20": "A", "q-21": "A" }
// "q-20-21-22" -> { "q-20": "A", "q-21": "A", "q-22": "A" }
function expandGroupName(groupName: string, value: string | string[]): Record<string, string> {
  const parts = groupName.split('-')  // ["q", "20", "21"]
  const prefix = parts[0]             // "q"
  const indices: number[] = []
  for (let i = 1; i < parts.length; i++) {
    const n = parseInt(parts[i], 10)
    if (!isNaN(n)) indices.push(n)
  }

  const val = Array.isArray(value) ? value : [value]
  const result: Record<string, string> = {}
  indices.forEach((idx, i) => {
    result[`${prefix}-${idx}`] = val[i] ?? val[0] ?? ''
  })
  console.log('[RawHTMLContent] expandGroupName:', groupName, '->', result)
  return result
}

function isGroupName(name: string): boolean {
  // q-20-21 has 3+ parts: ["q", "20", "21"]
  return /^\w+(-\d+){2,}$/.test(name)
}

// Collapse individual keys like { "q-20": "A", "q-21": "A" } back to { "q-20-21": "A" }
// for init sync with HTML group inputs
function collapseToGroup(answers: Record<string, string | string[] | null>): Record<string, string | string[] | null> {
  const result: Record<string, string | string[] | null> = {}
  const grouped = new Map<string, Record<number, string>>()

  Object.entries(answers).forEach(([key, value]) => {
    const parts = key.split('-')
    if (parts.length < 2) {
      result[key] = value
      return
    }
    const prefix = parts.slice(0, -1).join('-')
    const idx = parseInt(parts[parts.length - 1], 10)
    if (isNaN(idx)) {
      result[key] = value
      return
    }
    if (!grouped.has(prefix)) grouped.set(prefix, {})
    grouped.get(prefix)![idx] = value as string
  })

  grouped.forEach((indices, prefix) => {
    const sortedIndices = Object.keys(indices).map(Number).sort((a, b) => a - b)
    const groupName = `${prefix}-${sortedIndices.join('-')}`
    if (sortedIndices.length > 1) {
      result[groupName] = indices[sortedIndices[0]]
    } else {
      result[`${prefix}-${sortedIndices[0]}`] = indices[sortedIndices[0]]
    }
  })

  return result
}

/**
 * Render raw HTML content with interactive inputs (radio, checkbox, select, text)
 * This is a fallback for cases where question parsing fails or for complex HTML structures
 * like TRUE/FALSE questions where each option is in a separate <p> tag
 */
export function RawHTMLContent({
  html,
  answers,
  onChange,
  disabled = false,
}: RawHTMLContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const answersRef = useRef(answers)
  const onChangeRef = useRef(onChange)
  const initializedKeys = useRef<Set<string>>(new Set())

  // Keep refs in sync
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Initialize DOM inputs with saved answers (only once per key/instance)
  useEffect(() => {
    if (!containerRef.current || disabled) return
    const container = containerRef.current

    function init() {
      if (!container) return
      if (initializedKeys.current.has('mounted')) return
      initializedKeys.current.add('mounted')

      // Collapse individual keys back to group names for init
      const collapsedAnswers = collapseToGroup(answers)
      console.log('[RawHTMLContent] init - answers keys:', Object.keys(answers).join(', '))
      console.log('[RawHTMLContent] init - collapsedAnswers:', JSON.stringify(collapsedAnswers))

      // Dump all DOM inputs
      const allInputs = containerRef.current?.querySelectorAll('input, select, textarea')
      const inputSummary: string[] = []
      allInputs?.forEach(el => {
        const n = el.getAttribute('name') || 'NO_NAME'
        inputSummary.push(`${el.tagName}[name=${n}]`)
      })
      console.log('[RawHTMLContent] init - DOM inputs:', inputSummary.join(', '))

      let matchedCount = 0
      let missedCount = 0

      Object.entries(collapsedAnswers).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return

        // Expand collapsed group keys like "q-1-2-3" into individual keys "q-1","q-2","q-3"
        const individualKeys = expandGroupName(key, value)

        let keyMatched = false

        // Expand collapsed group keys like "q-1-2-3" into individual keys "q-1","q-2","q-3"
        Object.entries(individualKeys).forEach(([indKey, _]) => {
          // Sync text inputs
          const textInput = containerRef.current?.querySelector(
            `input[type="text"][name="${indKey}"]`
          ) as HTMLInputElement | null
          if (textInput) {
            textInput.value = String(value)
            matchedCount++
            keyMatched = true
            return
          }

          // Sync radio inputs
          const radioInputs = containerRef.current?.querySelectorAll(
            `input[type="radio"][name="${indKey}"]`
          ) as NodeListOf<HTMLInputElement>
          if (radioInputs && radioInputs.length > 0) {
            radioInputs.forEach((radio) => {
              radio.checked = radio.value === String(value)
            })
            matchedCount++
            keyMatched = true
            return
          }

          // Sync select inputs
          const selectInput = containerRef.current?.querySelector(
            `select[name="${indKey}"]`
          ) as HTMLSelectElement | null
          if (selectInput) {
            selectInput.value = String(value)
            matchedCount++
            keyMatched = true
            return
          }
        })

        if (!keyMatched) {
          // Try sync with original key (could be a checkbox group in DOM like "q-20-21")
          if (Array.isArray(value)) {
            const checkboxInputs = containerRef.current?.querySelectorAll(
              `input[type="checkbox"][name="${key}"]`
            ) as NodeListOf<HTMLInputElement>
            if (checkboxInputs && checkboxInputs.length > 0) {
              checkboxInputs.forEach((cb) => {
                cb.checked = (value as string[]).includes(cb.value)
              })
              matchedCount++
              keyMatched = true
            }
          } else {
            // Single value: try checkbox group with single value
            const checkboxInputs = containerRef.current?.querySelectorAll(
              `input[type="checkbox"][name="${key}"]`
            ) as NodeListOf<HTMLInputElement>
            if (checkboxInputs && checkboxInputs.length > 0) {
              checkboxInputs.forEach((cb) => {
                cb.checked = cb.value === String(value)
              })
              matchedCount++
              keyMatched = true
            }
          }
        }

        if (!keyMatched) {
          missedCount++
          console.log('[RawHTMLContent] init missed key:', key, '-> expanded:', Object.keys(individualKeys).join(','), 'value:', value)
        }
      })
      console.log('[RawHTMLContent] init complete - matched:', matchedCount, 'missed:', missedCount, 'total inputs:', allInputs?.length)
    }

    init()
  }, [disabled])

  // Listen to input changes
  useEffect(() => {
    if (disabled) return
    const container = containerRef.current
    if (!container) return

    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement
      const name = target.name || (target as HTMLElement).getAttribute('name')
      console.log('[RawHTMLContent] handleChange:', target.tagName, target.type, name)
      if (!name) {
        console.log('[RawHTMLContent] no name attribute, skipping. outerHTML:', (target as HTMLElement).outerHTML.substring(0, 200))
        return
      }

      let newValue: string | string[]

      if (target.type === 'radio') {
        const radio = target as HTMLInputElement
        if (!radio.checked) return
        newValue = radio.value
      } else if (target.type === 'checkbox') {
        const checkbox = target as HTMLInputElement
        // Read current checked values directly from DOM for this group
        const domCheckboxes = container?.querySelectorAll(
          `input[type="checkbox"][name="${name}"]`
        ) as NodeListOf<HTMLInputElement> | null
        let currentValues: string[] = []
        domCheckboxes?.forEach((cb) => {
          if (cb.checked) currentValues.push(cb.value)
        })

        // Fallback: try individual keys (expanded format) from answersRef
        if (currentValues.length === 0) {
          if (isGroupName(name)) {
            const expanded = expandGroupName(name, '')
            Object.keys(expanded).forEach((k) => {
              const v = answersRef.current[k]
              if (typeof v === 'string' && v) currentValues.push(v)
            })
            if (currentValues.length === 0) {
              const collapsedVal = answersRef.current[name]
              if (typeof collapsedVal === 'string' && collapsedVal) {
                currentValues = [collapsedVal]
              } else if (Array.isArray(collapsedVal)) {
                currentValues = [...collapsedVal]
              }
            }
          } else {
            currentValues = ((answersRef.current[name] as string[]) || [])
          }
        }
        if (checkbox.checked) {
          newValue = [...currentValues, checkbox.value]
        } else {
          newValue = currentValues.filter((v) => v !== checkbox.value)
        }
      } else if (target.tagName === 'SELECT') {
        newValue = (target as HTMLSelectElement).value
      } else if (target.type === 'text') {
        newValue = (target as HTMLInputElement).value
      } else {
        return
      }

      // For checkbox groups (DOM name like "q-20-21"), save with the group key directly.
      // For other inputs, use the input name as key.
      let newAnswers: Record<string, string | string[] | null>
      if (target.type === 'checkbox' && isGroupName(name)) {
        newAnswers = { ...answersRef.current, [name]: newValue }
      } else {
        newAnswers = { ...answersRef.current, [name]: newValue }
      }
      answersRef.current = newAnswers
      onChangeRef.current(newAnswers)
    }

    container.addEventListener('change', handleChange)
    container.addEventListener('input', handleChange as EventListener)

    const debugInterval = setInterval(() => {
      const all = container?.querySelectorAll('input, select, textarea')
      if (!all) return
      const summary: string[] = []
      all.forEach(el => {
        const checked = (el as HTMLInputElement).checked
        const value = (el as HTMLInputElement).value
        summary.push(`${el.tagName}[name=${el.getAttribute('name') || 'NO_NAME'}][type=${el.getAttribute('type') || 'N/A'}][value=${value}][checked=${checked}]`)
      })
      console.log('[RawHTMLContent] inputs snapshot:', summary)

      // Also dump the raw HTML for q-20-21 section
      const q2021 = container?.querySelector('[name="q-20-21"]')
      if (q2021) {
        const parent = q2021.closest('div, p, tr, li')
        console.log('[RawHTMLContent] q-20-21 parent HTML:', parent?.innerHTML?.substring(0, 500))
      }
    }, 3000)

    return () => {
      container.removeEventListener('change', handleChange)
      container.removeEventListener('input', handleChange as EventListener)
      clearInterval(debugInterval)
    }
  }, [disabled])

  return (
    <div
      ref={containerRef}
      className="exam-raw-html"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
