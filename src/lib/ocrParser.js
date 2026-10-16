import { PLANS, planEndDate, today } from './utils.js'

// Helper to normalize text lines while preserving column delimiters
export function cleanLine(line) {
  return line.replace(/\s+/g, ' ').trim()
}

export function isHeaderRow(line) {
  const lower = line.toLowerCase()
  const headerKeywords = ['name', 'mobile', 'phone', 'fee', 'fees', 'paid', 'plan', 'date', 'sr', 's.no', 'amount', 'joining', 'expiry']
  let count = 0
  for (const kw of headerKeywords) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(lower)) {
      count++
    }
  }
  return count >= 2
}

// Convert various date formats into YYYY-MM-DD ISO string
export function parseAnyDate(raw) {
  if (!raw) return null
  const cleaned = raw.trim().replace(/[.]/g, '-').replace(/[/]/g, '-')

  // Matches YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Matches DD-MM-YYYY or D-M-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // Matches text dates like "14 Oct 2026", "14 October 2026"
  const textDateMatch = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (textDateMatch) {
    const months = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    }
    const [, d, monStr, y] = textDateMatch
    const monKey = monStr.slice(0, 3).toLowerCase()
    const m = months[monKey]
    if (m) {
      return `${y}-${m}-${d.padStart(2, '0')}`
    }
  }

  return null
}

// Map free text duration or plan name to canonical PLANS
export function normalizePlan(planText) {
  if (!planText) return '1 Month'
  const lower = planText.toLowerCase()
  if (lower.includes('12 month') || lower.includes('1 year') || lower.includes('1 yr') || lower.includes('annual')) {
    return '12 Months'
  }
  if (lower.includes('6 month') || lower.includes('half year') || lower.includes('6m')) {
    return '6 Months'
  }
  if (lower.includes('3 month') || lower.includes('quarter') || lower.includes('3m')) {
    return '3 Months'
  }
  if (lower.includes('1 month') || lower.includes('monthly') || lower.includes('1m')) {
    return '1 Month'
  }
  const match = PLANS.find((p) => p.label.toLowerCase() === lower)
  return match ? match.label : 'Custom'
}

// Extract mobile number (standard 10-digit Indian mobile or with country code)
export function extractPhone(text) {
  if (!text) return ''
  // 10-digit number starting with 6-9, optionally with +91 or 0 prefix
  const phoneMatch = text.match(/(?:\+91[\s-]?)?(?:0)?([6-9]\d{4}[\s-]?\d{5})\b/)
  if (phoneMatch) {
    return phoneMatch[1].replace(/[\s-]/g, '')
  }
  // Generic 10 consecutive digits
  const genericMatch = text.match(/\b\d{10}\b/)
  return genericMatch ? genericMatch[0] : ''
}

// Deterministically parse a single block of text representing a member
export function parseSingleRecordBlock(textBlock) {
  const lines = textBlock
    .split('\n')
    .map(cleanLine)
    .filter(Boolean)

  const record = {
    name: '',
    phone: '',
    plan: '1 Month',
    start_date: today(),
    end_date: planEndDate(today(), 1),
    total_fee: '',
    paid_amount: '',
    notes: '',
    detectedFields: {},
  }

  let explicitEndDate = null

  // Check labeled lines first
  for (let rawLine of lines) {
    const line = rawLine.replace(/^\s*(?:#|\d+[).]\s*)/, '').trim()
    // Name label
    const nameMatch = line.match(/^(?:member(?:\s*name)?|name|client|student)\s*[:=-]\s*(.+)$/i)
    if (nameMatch && !record.name) {
      record.name = nameMatch[1].replace(/[^a-zA-Z\s.]/g, '').trim()
      record.detectedFields.name = true
      continue
    }

    // Phone label
    const phoneLabelMatch = line.match(/^(?:mobile|phone|contact|mob|ph|cell)\s*(?:no|number)?\s*[:=-]\s*(.+)$/i)
    if (phoneLabelMatch && !record.phone) {
      const ph = extractPhone(phoneLabelMatch[1])
      if (ph) {
        record.phone = ph
        record.detectedFields.phone = true
        continue
      }
    }

    // Plan label
    const planMatch = line.match(/^(?:plan|package|duration|period)\s*[:=-]\s*(.+)$/i)
    if (planMatch && record.plan === '1 Month' && !record.detectedFields.plan) {
      record.plan = normalizePlan(planMatch[1])
      record.detectedFields.plan = true
      continue
    }

    // Start / Joining date label
    const startMatch = line.match(/^(?:joining(?:\s*date)?|join(?:\s*date)?|start(?:\s*date)?|doj|reg(?:\s*date)?)\s*[:=-]\s*(.+)$/i)
    if (startMatch) {
      const d = parseAnyDate(startMatch[1])
      if (d) {
        record.start_date = d
        record.detectedFields.start_date = true
        continue
      }
    }

    // Expiry / End date label
    const endMatch = line.match(/^(?:expiry(?:\s*date)?|end(?:\s*date)?|valid(?:\s*till)?|exp(?:\s*date)?)\s*[:=-]\s*(.+)$/i)
    if (endMatch) {
      const d = parseAnyDate(endMatch[1])
      if (d) {
        explicitEndDate = d
        record.end_date = d
        record.detectedFields.end_date = true
        continue
      }
    }

    // Total Fee label
    const feeMatch = line.match(/^(?:total\s*fee|fee|fees|total\s*amount|charge)\s*[:=-]\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)/i)
    if (feeMatch && record.total_fee === '') {
      record.total_fee = Number(feeMatch[1])
      record.detectedFields.total_fee = true
      continue
    }

    // Paid amount label
    const paidMatch = line.match(/^(?:paid(?:\s*amount)?|received|advance|advance\s*paid)\s*[:=-]\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)/i)
    if (paidMatch && record.paid_amount === '') {
      record.paid_amount = Number(paidMatch[1])
      record.detectedFields.paid_amount = true
      continue
    }

    // Standalone mobile fallback
    if (!record.phone) {
      const ph = extractPhone(line)
      if (ph) {
        record.phone = ph
        record.detectedFields.phone = true
      }
    }
  }

  // If name is still missing, try heuristic on first non-numeric line without colon
  if (!record.name && lines.length > 0) {
    for (const line of lines) {
      if (!line.includes(':') && !/\d{4,}/.test(line)) {
        const cleanName = line.replace(/[^a-zA-Z\s.]/g, '').trim()
        if (cleanName.length >= 2 && cleanName.length <= 40 && !/^(all|active|expired|fee|paid|plan|date)$/i.test(cleanName)) {
          record.name = cleanName
          record.detectedFields.name = true
          break
        }
      }
    }
  }

  // If start_date is known but end_date was not explicitly specified, calculate based on plan
  if (record.start_date && !explicitEndDate) {
    const planObj = PLANS.find((p) => p.label === record.plan)
    if (planObj) {
      record.end_date = planEndDate(record.start_date, planObj.months)
    }
  }

  return record
}

// Parse tabular or delimited line into member fields
// e.g., "1. Rahul Sharma | 9876543210 | 3 Months | 3000 | 2000 | 01/10/2026"
export function parseTabularLine(line) {
  if (isHeaderRow(line)) return null

  // Remove leading row number e.g. "1.", "1)", "#1"
  const cleaned = line.replace(/^\s*(?:#|\d+[).]\s*)/, '').trim()
  if (!cleaned) return null

  // Split by pipe, comma, or 2+ consecutive spaces
  const parts = cleaned.split(/\s*\|\s*|\s*,\s*|\s{2,}/).map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return null

  const record = {
    name: '',
    phone: '',
    plan: '1 Month',
    start_date: today(),
    end_date: planEndDate(today(), 1),
    total_fee: '',
    paid_amount: '',
    notes: '',
    detectedFields: {},
  }

  for (const part of parts) {
    // Check if phone
    const ph = extractPhone(part)
    if (ph && !record.phone) {
      record.phone = ph
      record.detectedFields.phone = true
      continue
    }

    // Check if date
    const d = parseAnyDate(part)
    if (d) {
      if (!record.detectedFields.start_date) {
        record.start_date = d
        record.detectedFields.start_date = true
      } else if (!record.detectedFields.end_date) {
        record.end_date = d
        record.detectedFields.end_date = true
      }
      continue
    }

    // Check if money amount
    const moneyMatch = part.match(/^(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)$/i)
    if (moneyMatch) {
      const val = Number(moneyMatch[1])
      if (record.total_fee === '') {
        record.total_fee = val
        record.detectedFields.total_fee = true
      } else if (record.paid_amount === '') {
        record.paid_amount = val
        record.detectedFields.paid_amount = true
      }
      continue
    }

    // Check if plan duration
    if (/month|year|yr|quarter/i.test(part) && !record.detectedFields.plan) {
      record.plan = normalizePlan(part)
      record.detectedFields.plan = true
      continue
    }

    // Otherwise candidate for name
    if (!record.name && /^[a-zA-Z\s.]{2,40}$/.test(part)) {
      record.name = part.trim()
      record.detectedFields.name = true
    }
  }

  // Only return if at least name or phone was detected
  if (record.name || record.phone) {
    const planObj = PLANS.find((p) => p.label === record.plan)
    if (planObj && !record.detectedFields.end_date && record.start_date) {
      record.end_date = planEndDate(record.start_date, planObj.months)
    }
    return record
  }

  return null
}

// Main parser that extracts multiple member candidate records from raw OCR text
export function parseNotebookText(rawText) {
  if (!rawText || !rawText.trim()) return []

  const lines = rawText.split('\n').map(cleanLine).filter(Boolean)
  if (lines.length === 0) return []

  // Strategy 1: Check if lines look like tabular rows (containing pipes, commas, or multiple fields per line)
  const candidateTabularRows = []
  for (const line of lines) {
    // Ignore header rows
    if (/^(s\.?no|no\.?|sr|member|name)\s*[|,]/i.test(line) && /phone|mobile|fee|plan/i.test(line)) {
      continue
    }
    const parsedRow = parseTabularLine(line)
    if (parsedRow) {
      candidateTabularRows.push(parsedRow)
    }
  }

  if (candidateTabularRows.length >= 2) {
    return candidateTabularRows
  }

  // Strategy 2: Check for numbered entries or distinct member blocks separated by empty lines or 'Name:' labels
  const blocks = []
  let currentBlock = []

  for (const line of lines) {
    const isNewNumberedEntry = /^\s*(?:\d+[).]\s+|#\d+\s+)/.test(line)
    const isNewNameLabel = /^(?:member(?:\s*name)?|name|client)\s*[:=-]/i.test(line)

    if ((isNewNumberedEntry || isNewNameLabel) && currentBlock.length > 0) {
      blocks.push(currentBlock.join('\n'))
      currentBlock = [line]
    } else {
      currentBlock.push(line)
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n'))
  }

  if (blocks.length > 1) {
    const records = blocks.map(parseSingleRecordBlock).filter((r) => r.name || r.phone)
    if (records.length > 0) return records
  }

  // Strategy 3: Parse entire text as a single record
  const single = parseSingleRecordBlock(rawText)
  return single.name || single.phone ? [single] : []
}
