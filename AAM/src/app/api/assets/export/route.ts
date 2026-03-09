import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function escapeCsvField(value: string | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET() {
  const supabase = await createClient()

  const { data: assets, error } = await supabase
    .from('assets')
    .select('*')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const headers = [
    'name', 'asset_tag', 'category', 'manufacturer', 'model',
    'serial_number', 'location', 'status', 'purchase_date', 'purchase_cost', 'notes',
  ]

  const rows = (assets ?? []).map((a) =>
    headers.map((h) => escapeCsvField(a[h as keyof typeof a] as string)).join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="assets-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
