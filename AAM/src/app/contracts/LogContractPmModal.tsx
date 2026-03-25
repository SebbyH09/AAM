'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface ContractAsset {
  asset_id: string
  assets: { id: string; name: string; asset_tag: string | null } | null
}

interface Contract {
  id: string
  vendor_name: string
  asset_id: string | null
  pm_interval_months: number
  service_contract_assets: ContractAsset[]
}

interface LogContractPmModalProps {
  contract: Contract
  onClose: () => void
}

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'requires_followup', label: 'Requires Follow-up' },
]

export default function LogContractPmModal({ contract, onClose }: LogContractPmModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const linkedAssets = contract.service_contract_assets
    ?.map((sca) => ({ id: sca.asset_id, name: sca.assets?.name ?? 'Unknown', asset_tag: sca.assets?.asset_tag }))
    ?? []

  const [selectedAssetId, setSelectedAssetId] = useState(linkedAssets[0]?.id ?? contract.asset_id ?? '')

  const assetOptions = linkedAssets.map((a) => ({
    value: a.id,
    label: `${a.name}${a.asset_tag ? ` (${a.asset_tag})` : ''}`,
  }))

  const [form, setForm] = useState({
    performed_by: '',
    performed_date: today,
    duration_hours: '',
    description: `PM performed under contract: ${contract.vendor_name}`,
    findings: '',
    parts_replaced: '',
    cost: '',
    status: 'completed',
    notes: '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.performed_by || !form.description) {
      setError('Performed by and description are required.')
      return
    }
    if (!selectedAssetId) {
      setError('Please select an asset for this PM record.')
      return
    }
    setLoading(true)
    setError('')

    // Insert maintenance record
    const recordPayload = {
      asset_id: selectedAssetId,
      maintenance_plan_id: null,
      performed_by: form.performed_by,
      performed_date: form.performed_date,
      duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
      type: 'preventive' as const,
      description: form.description,
      findings: form.findings || null,
      parts_replaced: form.parts_replaced || null,
      cost: form.cost ? parseFloat(form.cost) : null,
      status: form.status as any,
      next_maintenance_date: null,
      notes: form.notes || null,
    }

    const { error: recordError } = await supabase.from('maintenance_records').insert(recordPayload)
    if (recordError) { setError(recordError.message); setLoading(false); return }

    // Update contract's pm_last_performed_date
    await supabase.from('service_contracts').update({
      pm_last_performed_date: form.performed_date,
    }).eq('id', contract.id)

    // Also add as a service report
    await supabase.from('service_reports').insert({
      service_contract_id: contract.id,
      asset_id: selectedAssetId,
      report_date: form.performed_date,
      technician: form.performed_by,
      type: 'pm_completed',
      summary: form.description,
      findings: form.findings || null,
      recommendations: null,
      parts_used: form.parts_replaced || null,
      labor_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
      cost: form.cost ? parseFloat(form.cost) : null,
      status: form.status,
      notes: form.notes || null,
    })

    router.refresh()
    onClose()
  }

  const selectedAssetName = linkedAssets.find((a) => a.id === selectedAssetId)?.name ?? 'N/A'

  return (
    <Modal open={true} onClose={onClose} title="Log Preventive Maintenance" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-sm text-blue-700">
            <strong>Contract:</strong> {contract.vendor_name}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            PM interval: every {contract.pm_interval_months} month{contract.pm_interval_months !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {linkedAssets.length > 1 ? (
            <div className="sm:col-span-2">
              <Select
                label="Equipment *"
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                options={assetOptions}
              />
            </div>
          ) : (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                {selectedAssetName}
              </p>
            </div>
          )}
          <Input label="Performed By *" value={form.performed_by} onChange={set('performed_by')} placeholder="Technician name" />
          <Input label="Date Performed *" type="date" value={form.performed_date} onChange={set('performed_date')} />
          <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
          <Input label="Duration (hours)" type="number" value={form.duration_hours} onChange={set('duration_hours')} placeholder="0.0" step="0.5" min="0" />
          <Input label="Cost ($)" type="number" value={form.cost} onChange={set('cost')} placeholder="0.00" step="0.01" min="0" />
          <Input label="Parts Replaced" value={form.parts_replaced} onChange={set('parts_replaced')} placeholder="e.g. Filter, oil, belt..." />
          <div className="sm:col-span-2">
            <Textarea label="Description *" value={form.description} onChange={set('description')} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Findings" value={form.findings} onChange={set('findings')} placeholder="What was found during PM?" />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} rows={2} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>Log PM</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  )
}
