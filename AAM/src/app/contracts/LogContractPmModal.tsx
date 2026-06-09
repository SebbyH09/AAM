'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface LinkedAssetInfo {
  asset_id: string
  pm_last_performed_date: string | null
  name: string
  asset_tag: string | null
}

interface Contract {
  id: string
  vendor_name: string
  asset_id: string | null
  asset_ids?: string[]
  linked_asset_names?: string
  linked_assets?: LinkedAssetInfo[]
  pm_interval_months: number
  assets: { name: string; asset_tag: string | null } | null
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

  const allAssetIds = contract.asset_ids ?? (contract.asset_id ? [contract.asset_id] : [])
  const linkedAssets = contract.linked_assets ?? []
  const hasMultipleAssets = linkedAssets.length > 1

  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set(allAssetIds))

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

  function toggleAsset(assetId: string) {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev)
      if (next.has(assetId)) {
        next.delete(assetId)
      } else {
        next.add(assetId)
      }
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelectedAssetIds(checked ? new Set(allAssetIds) : new Set())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.performed_by || !form.description) {
      setError('Performed by and description are required.')
      return
    }
    if (selectedAssetIds.size === 0) {
      setError('Select at least one asset.')
      return
    }
    setLoading(true)
    setError('')

    const targetAssetIds = Array.from(selectedAssetIds)

    // Insert a maintenance record for each selected asset
    for (const assetId of targetAssetIds) {
      const { error: recordError } = await supabase.from('maintenance_records').insert({
        asset_id: assetId,
        maintenance_plan_id: null,
        performed_by: form.performed_by,
        performed_date: form.performed_date,
        duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
        type: 'preventive' as const,
        description: form.description,
        findings: form.findings || null,
        parts_replaced: form.parts_replaced || null,
        cost: form.cost ? parseFloat(form.cost) : null,
        status: form.status as 'completed' | 'incomplete' | 'requires_followup',
        next_maintenance_date: null,
        notes: form.notes || null,
      })
      if (recordError) { setError(recordError.message); setLoading(false); return }

      // Update per-asset PM date in the junction table
      const { error: junctionError } = await supabase
        .from('service_contract_assets')
        .update({ pm_last_performed_date: form.performed_date })
        .eq('service_contract_id', contract.id)
        .eq('asset_id', assetId)
      if (junctionError) { setError(junctionError.message); setLoading(false); return }
    }

    // Update contract-level pm_last_performed_date
    await supabase
      .from('service_contracts')
      .update({ pm_last_performed_date: form.performed_date })
      .eq('id', contract.id)

    // Create a service report linked to the contract
    await supabase.from('service_reports').insert({
      service_contract_id: contract.id,
      asset_id: targetAssetIds[0] ?? null,
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

  const allSelected = selectedAssetIds.size === allAssetIds.length
  const someSelected = selectedAssetIds.size > 0 && !allSelected

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

        {/* Asset selection — only shown when contract covers multiple assets */}
        {hasMultipleAssets && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Units being serviced</label>
              <button
                type="button"
                onClick={() => toggleAll(!allSelected)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
              {linkedAssets.map((asset) => (
                <label key={asset.asset_id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedAssetIds.has(asset.asset_id)}
                    onChange={() => toggleAsset(asset.asset_id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-800">{asset.name}</span>
                    {asset.asset_tag && <span className="text-xs text-gray-400 ml-1">({asset.asset_tag})</span>}
                  </div>
                  {asset.pm_last_performed_date && (
                    <span className="text-xs text-gray-400 shrink-0">
                      Last: {new Date(asset.pm_last_performed_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </label>
              ))}
            </div>
            {someSelected && (
              <p className="text-xs text-amber-600 mt-1">
                Logging PM for {selectedAssetIds.size} of {allAssetIds.length} units
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
