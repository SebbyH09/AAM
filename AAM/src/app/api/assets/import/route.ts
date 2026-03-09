import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }
  fields.push(current.trim())
  return fields
}

const VALID_STATUSES = ['active', 'inactive', 'decommissioned', 'repair']
const REQUIRED_HEADERS = ['name', 'category']

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const text = await file.text()
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')

  if (lines.length < 2) {
    return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 })
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'))

  for (const req of REQUIRED_HEADERS) {
    if (!headers.includes(req)) {
      return NextResponse.json({ error: `Missing required column: ${req}` }, { status: 400 })
    }
  }

  const imported: number[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? ''
    })

    if (!row.name || !row.category) {
      errors.push(`Row ${i + 1}: name and category are required`)
      continue
    }

    const status = row.status?.toLowerCase() || 'active'
    if (!VALID_STATUSES.includes(status)) {
      errors.push(`Row ${i + 1}: invalid status "${row.status}"`)
      continue
    }

    const asset: Record<string, unknown> = {
      name: row.name,
      category: row.category,
      status,
      asset_tag: row.asset_tag || null,
      manufacturer: row.manufacturer || null,
      model: row.model || null,
      serial_number: row.serial_number || null,
      location: row.location || null,
      purchase_date: row.purchase_date || null,
      purchase_cost: row.purchase_cost ? parseFloat(row.purchase_cost) : null,
      notes: row.notes || null,
    }

    const { error } = await supabase.from('assets').insert(asset)
    if (error) {
      errors.push(`Row ${i + 1}: ${error.message}`)
    } else {
      imported.push(i + 1)
    }
  }

  return NextResponse.json({
    imported: imported.length,
    errors,
    total: lines.length - 1,
  })
}
