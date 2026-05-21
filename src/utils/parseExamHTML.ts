import type { QuestionOption } from '@/api/trialExam'

/**
 * Parse HTML passage to extract questions with options.
 * Legacy format can be either:
 * 1. Table-based: options in header row, questions in data rows
 * 2. Inline: radio buttons embedded directly in paragraphs
 * 3. Select-based: questions with <select> dropdown for drag-drop/matching
 * 4. Text input: fill-in-the-blank questions with <input type="text">
 */

/**
 * Parse HTML and extract structured questions with options
 */
export function parseQuestionsFromHTML(html: string): ParsedQuestion[] {
  // Try table-based parsing first (most common for IELTS reading - paragraph matching)
  const tableQuestions = parseTableQuestions(html)
  if (tableQuestions.length > 0) {
    return tableQuestions
  }

  // Try select-based parsing (drag-drop, matching)
  const selectQuestions = parseSelectQuestions(html)
  if (selectQuestions.length > 0) {
    return selectQuestions
  }

  // Fallback to inline parsing
  return parseInlineQuestions(html)
}

export interface ParsedQuestion {
  question_index: number
  question: string
  html_question?: string
  question_type: 'multiple_choice' | 'true_false' | 'yes_no' | 'fill_blank' | 'matching' | 'drag_drop' | 'paragraph_matching' | 'select'
  part_index: number
  group_index: number
  options?: QuestionOption[]
  drag_options?: string[]
}

/**
 * Helper to extract just the question text and HTML for a specific question number
 */
function extractQuestionContent(container: Element, qIndex: number): { text: string; html: string } | null {
  // Look for a <p> or element that starts with this question number
  const elements = container.querySelectorAll('p, td, span, div')
  for (const el of elements) {
    const text = el.textContent?.trim() || ''
    if (text.includes(`${qIndex}.`) || text.includes(`${qIndex})`)) {
      // Check if this element starts with the question number
      const match = text.match(/^(\d+)[\.\)]\s+(.+)/s)
      if (match && parseInt(match[1], 10) === qIndex) {
        return {
          text: text,
          html: el.innerHTML,
        }
      }
    }
  }
  return null
}

/**
 * Parse questions from HTML tables
 * Structure: Table with rows containing question text and radio buttons.
 * Radio name format: name="q-6" where 6 is the question number
 * IMPORTANT: Only parse radios that are INSIDE a table element
 */
function parseTableQuestions(html: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Only find radio inputs that are INSIDE table elements
  const tables = doc.querySelectorAll('table')
  const allRadios: Element[] = []

  tables.forEach((table) => {
    table.querySelectorAll('input[type="radio"]').forEach((radio) => {
      allRadios.push(radio)
    })
  })

  // If no tables with radios found, return empty
  if (allRadios.length === 0) {
    return []
  }

  // Collect unique option values
  const optionLabels: string[] = []
  const seenValues = new Set<string>()

  // Map of question index -> radio elements for that question
  const radiosByQuestion = new Map<number, Element[]>()

  allRadios.forEach((radio) => {
    const value = radio.getAttribute('value')
    const name = radio.getAttribute('name')

    // Extract question index from name (e.g., "q-6" -> 6)
    if (name) {
      const match = name.match(/q-(\d+)/)
      if (match) {
        const qIndex = parseInt(match[1], 10)
        if (!radiosByQuestion.has(qIndex)) {
          radiosByQuestion.set(qIndex, [])
        }
        radiosByQuestion.get(qIndex)!.push(radio)
      }
    }

    // Collect unique option values
    if (value && !seenValues.has(value)) {
      seenValues.add(value)
      optionLabels.push(value)
    }
  })

  // If no options found, use default
  if (optionLabels.length === 0) {
    optionLabels.push('A', 'B', 'C', 'D')
  }

  // Get unique question indices
  const questionIndices = Array.from(radiosByQuestion.keys()).sort((a, b) => a - b)

  questionIndices.forEach((qIndex) => {
    // Find the specific paragraph or cell element that contains ONLY this question
    const radios = radiosByQuestion.get(qIndex) || []
    let questionText = ''
    let questionHTML = ''

    // Look for the specific paragraph that contains this question number
    for (const radio of radios) {
      // Find the closest <p> tag with this question number
      const pElement = radio.closest('p')
      if (pElement) {
        const pText = pElement.textContent?.trim() || ''
        // Check if this <p> contains ONLY this question (or starts with it)
        if (pText.includes(`${qIndex}.`) || pText.includes(`${qIndex})`)) {
          // Check if this <p> only has this one question (not multiple questions)
          const questionPattern = new RegExp(`^${qIndex}[\\.\\)]\\s`)
          if (questionPattern.test(pText)) {
            questionText = pText.replace(/^\d+[\.\)]\s*/, '').trim()
            questionHTML = pElement.innerHTML.trim()
            break
          }
        }
      }
    }

    // If no specific <p> found, try to find in the table cell
    if (!questionText) {
      for (const radio of radios) {
        let parent = radio.parentElement
        let depth = 0
        while (parent && depth < 5) {
          const text = parent.textContent?.trim() || ''
          // Check if this parent contains ONLY this question number
          if (text.includes(`${qIndex}.`) || text.includes(`${qIndex})`)) {
            // Try to find the specific element with this question number
            const questionP = parent.querySelector(`p, td, th, span`)
            if (questionP) {
              const pText = questionP.textContent?.trim() || ''
              if (pText.includes(`${qIndex}.`) || pText.includes(`${qIndex})`)) {
                questionText = pText.replace(/^\d+[\.\)]\s*/, '').trim()
                questionHTML = `<p>${questionP.innerHTML}</p>`
                break
              }
            }
            
            // If no specific element, use this parent but wrap just the question part
            // Find the text node or element containing the question
            const questionContent = extractQuestionContent(parent, qIndex)
            if (questionContent) {
              questionText = questionContent.text.replace(/^\d+[\.\)]\s*/, '').trim()
              questionHTML = `<p>${questionContent.html}</p>`
              break
            }
          }
          parent = parent.parentElement
          depth++
        }
        if (questionText) break
      }
    }

    if (!questionText) {
      questionText = `Question ${qIndex}`
      questionHTML = `<p>${questionText}</p>`
    }

    // Create options
    const options: QuestionOption[] = optionLabels.map((label, idx) => ({
      key: String.fromCharCode(65 + idx),
      text: label,
      order: idx,
    }))

    // Determine type based on options
    const isTrueFalse = optionLabels.some(
      (l) => l.toUpperCase() === 'TRUE' || l.toUpperCase() === 'FALSE' || l.toUpperCase() === 'NOT GIVEN'
    )
    const isYesNo = optionLabels.some(
      (l) => l.toUpperCase() === 'YES' || l.toUpperCase() === 'NO'
    )
    const isParagraphMatching = optionLabels.some(
      (l) => /^[A-Z]$/i.test(l) && optionLabels.length <= 10
    )

    let questionType: ParsedQuestion['question_type'] = 'multiple_choice'
    if (isTrueFalse) questionType = 'true_false'
    else if (isYesNo) questionType = 'yes_no'
    else if (isParagraphMatching) questionType = 'paragraph_matching'

    questions.push({
      question_index: qIndex,
      question: questionText,
      html_question: questionHTML,
      question_type: questionType,
      part_index: 1,
      group_index: 1,
      options,
    })
  })

  return dedupeQuestions(questions)
}

/**
 * Parse questions from inline inputs in paragraphs
 * Handles: radio buttons (TRUE/FALSE), text inputs (fill-in-blank)
 * Group radio buttons by question number (q-1) even if each option is in separate <p> tags
 */
function parseInlineQuestions(html: string): ParsedQuestion[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Map of question number -> collected options
  const optionsByQuestion = new Map<number, { type: 'radio' | 'text'; value?: string }[]>()
  // Map of question number -> question text element
  const questionElements = new Map<number, Element>()

  // Step 1: Collect all inputs by question number
  doc.querySelectorAll('input[type="radio"]').forEach((radio) => {
    const name = radio.getAttribute('name')
    const value = radio.getAttribute('value')
    if (!name) return
    const match = name.match(/q-(\d+)/)
    if (!match) return
    const qIndex = parseInt(match[1], 10)
    if (!optionsByQuestion.has(qIndex)) {
      optionsByQuestion.set(qIndex, [])
    }
    optionsByQuestion.get(qIndex)!.push({ type: 'radio', value: value || undefined })
  })

  doc.querySelectorAll('input[type="text"]').forEach((input) => {
    const name = input.getAttribute('name')
    if (!name) return
    const match = name.match(/q-(\d+)/)
    if (!match) return
    const qIndex = parseInt(match[1], 10)
    if (!optionsByQuestion.has(qIndex)) {
      optionsByQuestion.set(qIndex, [])
    }
    optionsByQuestion.get(qIndex)!.push({ type: 'text' })
  })

  if (optionsByQuestion.size === 0) return []

  // Step 2: Find question text elements by looking for paragraphs with question numbers
  // Pattern: "X. Question text" or "X) Question text" where X is followed by text (capital letter or more)
  const sortedQIndices = Array.from(optionsByQuestion.keys()).sort((a, b) => a - b)

  // Find all paragraphs
  const allParagraphs = doc.querySelectorAll('p')

  allParagraphs.forEach((p) => {
    const text = p.textContent || ''
    // Try to match question number at start of text
    const match = text.match(/^(\d+)[\.\)]\s+[A-Z]/)
    if (match) {
      const qIndex = parseInt(match[1], 10)
      // Only store if we have inputs for this question
      if (optionsByQuestion.has(qIndex)) {
        // Check if we already found a question text for this index
        // (prefer the one with more content - likely the question rather than just options)
        const existing = questionElements.get(qIndex)
        if (!existing || (p.textContent?.length || 0) > (existing.textContent?.length || 0)) {
          questionElements.set(qIndex, p)
        }
      }
    }
  })

  // Step 3: Build questions
  const questions: ParsedQuestion[] = []

  for (const qIndex of sortedQIndices) {
    const inputs = optionsByQuestion.get(qIndex)!
    const firstInput = inputs[0]

    // Find question text
    let questionText = ''
    let questionHTML = ''

    const questionElement = questionElements.get(qIndex)
    if (questionElement) {
      // Store the ORIGINAL HTML (with inputs) for rendering
      questionHTML = questionElement.innerHTML.trim()
      // Extract text only by cloning and removing inputs
      const clone = questionElement.cloneNode(true) as Element
      clone.querySelectorAll('input').forEach((el) => el.remove())
      questionText = clone.textContent?.trim() || ''

      // Remove question number prefix
      questionText = questionText.replace(/^(\d+)[\.\)]\s*/, '').trim()
      questionText = questionText.replace(/^Question\s+\d+[\.\)]\s*/i, '').trim()
    }

    if (!questionText) {
      questionText = `Question ${qIndex}`
    }

    if (firstInput.type === 'text') {
      // Text input question (fill in the blank)
      questions.push({
        question_index: qIndex,
        question: questionText,
        html_question: questionHTML,
        question_type: 'fill_blank',
        part_index: 1,
        group_index: 1,
      })
    } else {
      // Radio button question - collect all unique option values
      const optionValues = new Set<string>()
      for (const input of inputs) {
        if (input.type === 'radio' && input.value) {
          optionValues.add(input.value)
        }
      }

      const optionLabels = Array.from(optionValues)
      // Sort if they look like letters or TRUE/FALSE/NOT GIVEN
      if (optionLabels.every((v) => /^[A-G]$/i.test(v))) {
        optionLabels.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      } else {
        // Keep original order for TRUE/FALSE/NOT GIVEN type options
        const preferredOrder = ['TRUE', 'FALSE', 'NOT GIVEN', 'YES', 'NO']
        optionLabels.sort((a, b) => {
          const aIdx = preferredOrder.indexOf(a.toUpperCase())
          const bIdx = preferredOrder.indexOf(b.toUpperCase())
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
          if (aIdx !== -1) return -1
          if (bIdx !== -1) return 1
          return a.localeCompare(b)
        })
      }

      const options: QuestionOption[] = optionLabels.map((label, idx) => ({
        key: label, // Use the actual value as key (TRUE, FALSE, NOT GIVEN)
        text: label,
        order: idx,
      }))

      // Determine question type based on options
      const isTrueFalse = optionLabels.some(
        (l) => l.toUpperCase() === 'TRUE' || l.toUpperCase() === 'FALSE' || l.toUpperCase() === 'NOT GIVEN'
      )
      const isYesNo = optionLabels.some(
        (l) => l.toUpperCase() === 'YES' || l.toUpperCase() === 'NO'
      )

      let questionType: ParsedQuestion['question_type'] = 'multiple_choice'
      if (isTrueFalse) questionType = 'true_false'
      else if (isYesNo) questionType = 'yes_no'

      questions.push({
        question_index: qIndex,
        question: questionText,
        html_question: questionHTML,
        question_type: questionType,
        part_index: 1,
        group_index: 1,
        options,
      })
    }
  }

  return dedupeQuestions(questions)
}

/**
 * Parse questions from select dropdowns (drag-drop, matching questions)
 * Extracts drag options and creates questions with select elements
 */
function parseSelectQuestions(html: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Find all select elements
  const selects = doc.querySelectorAll('select[name^="q-"]')

  if (selects.length === 0) return []

  // Find the main options list (usually in a separate select with name "choose-drag-and-drop")
  const mainOptionsSelect = doc.querySelector('select[name="choose-drag-and-drop"]')
  const dragOptions: string[] = []

  if (mainOptionsSelect) {
    const options = mainOptionsSelect.querySelectorAll('option')
    options.forEach((opt) => {
      const text = opt.textContent?.trim() || ''
      // Skip empty options and option labels like "A."
      if (text && !text.match(/^[A-G]\.\s*$/)) {
        dragOptions.push(text)
      }
    })
  }

  // Parse each question select
  selects.forEach((select) => {
    const name = select.getAttribute('name')
    if (!name || name === 'choose-drag-and-drop') return

    const match = name.match(/q-(\d+)/)
    if (!match) return

    const questionIndex = parseInt(match[1], 10)

    // Find the question text - look for the preceding paragraph
    let questionText = ''
    // Keep the ORIGINAL HTML with select element for rendering
    let questionHtml = ''

    // Get the parent container and look for question text
    const parent = select.closest('p') || select.parentElement
    if (parent) {
      // Store the ORIGINAL HTML (with select) for rendering
      questionHtml = parent.innerHTML.trim()
      // Extract text only by cloning and removing select
      const clone = parent.cloneNode(true) as Element
      clone.querySelectorAll('select').forEach((el) => el.remove())
      clone.querySelectorAll('input').forEach((el) => el.remove())
      questionText = clone.textContent?.trim() || ''
    }

    if (!questionText) {
      questionText = `Question ${questionIndex}`
    }

    // Create options for the select dropdown
    const selectOptions: QuestionOption[] = [
      { key: '', text: 'Select...', order: 0 }
    ]

    // Add drag options if available
    if (dragOptions.length > 0) {
      dragOptions.forEach((opt, idx) => {
        selectOptions.push({
          key: String.fromCharCode(65 + idx),
          text: opt,
          order: idx + 1,
        })
      })
    }

    questions.push({
      question_index: questionIndex,
      question: questionText,
      html_question: questionHtml,
      question_type: dragOptions.length > 0 ? 'drag_drop' : 'matching',
      part_index: 1,
      group_index: 1,
      options: selectOptions,
      drag_options: dragOptions,
    })
  })

  questions.sort((a, b) => a.question_index - b.question_index)
  return dedupeQuestions(questions)
}

function dedupeQuestions(questions: ParsedQuestion[]): ParsedQuestion[] {
  const seen = new Set<number>()
  const result: ParsedQuestion[] = []
  for (const q of questions) {
    if (!seen.has(q.question_index)) {
      seen.add(q.question_index)
      result.push(q)
    }
  }
  return result
}

export function hasEmbeddedQuestions(html: string): boolean {
  // Check for table structure
  const hasTable = /<table[^>]*>[\s\S]*?<\/table>/i.test(html)
  // Check for inline radio inputs in paragraphs
  const hasInlineRadios = /<p[^>]*>[\s\S]*?<input[^>]*type=["']radio["'][^>]*>[\s\S]*?<\/p>/i.test(html)
  // Check for select dropdowns (drag-drop questions)
  const hasSelect = /<select[^>]*name=["']q-\d+["'][^>]*>/i.test(html)
  // Check for text inputs
  const hasTextInputs = /<input[^>]*type=["']text["'][^>]*name=["']q-\d+["'][^>]*>/i.test(html)

  return hasTable || hasInlineRadios || hasSelect || hasTextInputs
}

export function extractOptionLabels(html: string): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const tables = doc.querySelectorAll('table')

  if (tables.length === 0) return ['A', 'B', 'C', 'D']

  const firstTable = tables[0]
  const headerRow = firstTable.querySelector('tr')
  if (!headerRow) return ['A', 'B', 'C', 'D']

  const cells = headerRow.querySelectorAll('td, th')
  const labels: string[] = []

  cells.forEach((cell) => {
    const text = cell.textContent?.trim() || ''
    if (/^[A-G]$/i.test(text)) {
      labels.push(text.toUpperCase())
    }
  })

  return labels.length > 0 ? labels : ['A', 'B', 'C', 'D']
}

/**
 * Parse fill-in-the-blank questions from HTML
 * Extracts text input fields with their surrounding context
 */
export function parseFillBlankQuestions(html: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Find all text inputs with question names
  const textInputs = doc.querySelectorAll('input[type="text"][name^="q-"]')

  textInputs.forEach((input) => {
    const name = input.getAttribute('name')
    if (!name) return

    const match = name.match(/q-(\d+)/)
    if (!match) return

    const questionIndex = parseInt(match[1], 10)

    // Find surrounding context for the question using closest()
    let questionText = ''
    let htmlQuestion = ''

    // Find the parent <p> or <span> that contains the question text
    const parent = input.closest('p, span, li')

    if (parent) {
      // Store the ORIGINAL HTML (with input) for rendering
      htmlQuestion = parent.innerHTML.trim()
      // Extract text only by cloning and removing input
      const clone = parent.cloneNode(true) as Element
      const inputClone = clone.querySelector(`[name="${name}"]`)
      if (inputClone) {
        inputClone.remove()
      }
      questionText = clone.textContent?.trim() || ''

      // Remove question number prefix
      questionText = questionText.replace(/^(\d+)[\.\)]\s*/, '').trim()
      questionText = questionText.replace(/^Question\s+\d+[\.\)]\s*/i, '').trim()
    }

    if (!questionText) {
      questionText = `Question ${questionIndex}`
    }

    questions.push({
      question_index: questionIndex,
      question: questionText,
      html_question: htmlQuestion,
      question_type: 'fill_blank',
      part_index: 1,
      group_index: 1,
    })
  })

  questions.sort((a, b) => a.question_index - b.question_index)
  return dedupeQuestions(questions)
}

/**
 * Combine all parsed questions from different parsers
 * Ensures no duplicates and proper ordering
 * NOTE: parseQuestionsFromHTML already handles table + inline + select parsing,
 * so we only add fill_blank questions here
 */
export function parseAllQuestions(html: string): ParsedQuestion[] {
  // parseQuestionsFromHTML handles: table questions, select questions, and inline questions
  // It returns early if any of those have results
  const questions = parseQuestionsFromHTML(html)
  
  // Add fill_blank questions if not already parsed
  const textQuestions = parseFillBlankQuestions(html)
  for (const tq of textQuestions) {
    // Only add if not already in questions (by question_index)
    if (!questions.some(q => q.question_index === tq.question_index)) {
      questions.push(tq)
    }
  }

  // Sort by question index
  questions.sort((a, b) => a.question_index - b.question_index)
  return dedupeQuestions(questions)
}

/**
 * Split HTML into passages (one per part)
 * Used for multi-passage reading exams like IELTS with 3 passages
 */
export function splitPassagesByPart(html: string): { passage: string; partIndex: number }[] {
  const passages: { passage: string; partIndex: number }[] = []

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Find all READING PASSAGE headers to split by part
  const passageHeaders = doc.querySelectorAll('p')
  let currentPartIndex = 1
  let currentPassageContent = ''
  let isInPassage = false

  passageHeaders.forEach((p) => {
    const text = p.textContent || ''

    // Check if this is a passage header
    if (/READING\s+PASSAGE\s+\d+/i.test(text)) {
      // Save previous passage if exists
      if (currentPassageContent) {
        passages.push({
          passage: currentPassageContent,
          partIndex: currentPartIndex,
        })
      }

      // Start new passage
      currentPartIndex = parseInt(text.match(/\d+/)?.[0] || '1', 10)
      currentPassageContent = ''
      isInPassage = true
    }

    // Collect passage content
    if (isInPassage && !/READING\s+PASSAGE/i.test(text)) {
      currentPassageContent += p.outerHTML
    }
  })

  // Save last passage
  if (currentPassageContent) {
    passages.push({
      passage: currentPassageContent,
      partIndex: currentPartIndex,
    })
  }

  // If no passages found, return the whole content as one part
  if (passages.length === 0) {
    passages.push({ passage: html, partIndex: 1 })
  }

  return passages
}
