'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface AddServiceReportModalProps {
  serviceContractId?: string | null
  maintenancePlanId?: string | null
  assetId?: string | null
  assetName?: string
  onClose: () => void
  onSaved?: () => void
}

const TYPE_OPTIONS = [
  { value: 'service_visit', label: 'Service Visit' },
  { value: 'pm_completed', label: 'PM Completed' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'repair', label: 'Repair' },
  { value: 'emergency', label: 'Emergency Call' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'requires_followup', label: 'Requires Follow-up' },
]

export default function AddServiceReportModal({
  serviceContractId,
  maintenancePlanId,
  assetId,
  assetName,
  onClose,
  onSaved,
}: AddServiceReportModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    report_date: today,
    technician: '',
    type: 'service_visit',
    summary: '',
    findings: '',
    recommendations: '',
    parts_used: '',
    labor_hours: '',
    cost: '',
    status: 'completed',
    notes: '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.technician || !form.summary) {
      setError('Technician and summary are required.')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      service_contract_id: serviceContractId ?? null,
      maintenance_plan_id: maintenancePlanId ?? null,
      asset_id: assetId ?? null,
      report_date: form.report_date,
      technician: form.technician,
      type: form.type,
      summary: form.summary,
      findings: form.findings || null,
      recommendations: form.recommendations || null,
      parts_used: form.parts_used || null,
      labor_hours: form.labor_hours ? parseFloat(form.labor_hours) : null,
      cost: form.cost ? parseFloat(form.cost) : null,
      status: form.status,
      notes: form.notes || null,
    }

    const { error: insertError } = await supabase.from('service_reports').insert(payload)
    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.refresh()
    onSaved?.()
    onClose()
  }

  return (
    <Modal open={true} onClose={onClose} title="Add Service Report" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        {assetName && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-700"><strong>Asset:</strong> {assetName}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Technician *" value={form.technician} onChange={set('technician')} placeholder="Technician name" />
          <Input label="Report Date *" type="date" value={form.report_date} onChange={set('report_date')} />
          <Select label="Type" value={form.type} onChange={set('type')} options={TYPE_OPTIONS} />
          <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
          <Input label="Labor Hours" type="number" value={form.labor_hours} onChange={set('labor_hours')} placeholder="0.0" step="0.5" min="0" />
          <Input label="Cost ($)" type="number" value={form.cost} onChange={set('cost')} placeholder="0.00" step="0.01" min="0" />
          <div className="sm:col-span-2">
            <Textarea label="Summary *" value={form.summary} onChange={set('summary')} placeholder="Brief summary of the service performed" />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Findings" value={form.findings} onChange={set('findings')} placeholder="What was found during the service?" />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Recommendations" value={form.recommendations} onChange={set('recommendations')} placeholder="Any follow-up recommendations?" />
          </div>
          <Input label="Parts Used" value={form.parts_used} onChange={set('parts_used')} placeholder="e.g. Filter, belt, oil..." />
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} rows={2} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>Save Report</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  )
}
