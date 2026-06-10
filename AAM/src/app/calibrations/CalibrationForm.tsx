'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Asset {
  id: string
  name: string
  asset_tag: string | null
}

interface CalibrationRecord {
  id: string
  asset_id: string
  calibration_date: string
  next_due_date: string
  performed_by: string
  calibration_standard: string | null
  result: string
  as_found_reading: string | null
  as_left_reading: string | null
  tolerance: string | null
  certificate_number: string | null
  notes: string | null
}

interface CalibrationFormProps {
  assets: Asset[]
  calibration?: CalibrationRecord
}

const RESULT_OPTIONS = [
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'out_of_tolerance', label: 'Out of Tolerance' },
  { value: 'adjusted', label: 'Adjusted' },
]

export default function CalibrationForm({ assets, calibration }: CalibrationFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const assetOptions = [
    { value: '', label: 'Select asset' },
    ...assets.map((a) => ({
      value: a.id,
      label: `${a.name}${a.asset_tag ? ` (${a.asset_tag})` : ''}`,
    })),
  ]

  const [form, setForm] = useState({
    asset_id: calibration?.asset_id ?? '',
    calibration_date: calibration?.calibration_date ?? today,
    next_due_date: calibration?.next_due_date ?? '',
    performed_by: calibration?.performed_by ?? '',
    calibration_standard: calibration?.calibration_standard ?? '',
    result: calibration?.result ?? 'pass',
    as_found_reading: calibration?.as_found_reading ?? '',
    as_left_reading: calibration?.as_left_reading ?? '',
    tolerance: calibration?.tolerance ?? '',
    certificate_number: calibration?.certificate_number ?? '',
    notes: calibration?.notes ?? '',
  })

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.asset_id || !form.calibration_date || !form.next_due_date || !form.performed_by) {
      setError('Asset, calibration date, next due date, and performed by are required.')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      asset_id: form.asset_id,
      calibration_date: form.calibration_date,
      next_due_date: form.next_due_date,
      performed_by: form.performed_by,
      calibration_standard: form.calibration_standard || null,
      result: form.result,
      as_found_reading: form.as_found_reading || null,
      as_left_reading: form.as_left_reading || null,
      tolerance: form.tolerance || null,
      certificate_number: form.certificate_number || null,
      notes: form.notes || null,
    }

    let result
    if (calibration) {
      result = await supabase.from('calibration_records').update(payload).eq('id', calibration.id)
    } else {
      result = await supabase.from('calibration_records').insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    router.push('/calibrations')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Select label="Asset *" value={form.asset_id} onChange={set('asset_id')} options={assetOptions} />
          </div>
          <Input label="Calibration Date *" type="date" value={form.calibration_date} onChange={set('calibration_date')} />
          <Input label="Next Due Date *" type="date" value={form.next_due_date} onChange={set('next_due_date')} />
          <Input label="Performed By *" value={form.performed_by} onChange={set('performed_by')} placeholder="Name or company" />
          <Input label="Calibration Standard" value={form.calibration_standard} onChange={set('calibration_standard')} placeholder="e.g. ISO 9001, NIST" />
          <Select label="Result *" value={form.result} onChange={set('result')} options={RESULT_OPTIONS} />
          <Input label="Tolerance" value={form.tolerance} onChange={set('tolerance')} placeholder="e.g. ±0.5%" />
          <Input label="As Found Reading" value={form.as_found_reading} onChange={set('as_found_reading')} placeholder="Before calibration" />
          <Input label="As Left Reading" value={form.as_left_reading} onChange={set('as_left_reading')} placeholder="After calibration" />
          <Input label="Certificate Number" value={form.certificate_number} onChange={set('certificate_number')} placeholder="Calibration certificate #" />
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>
            {calibration ? 'Update Calibration' : 'Save Calibration'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
