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

interface Budget {
  id: string
  name: string
  asset_id: string | null
  department: string | null
  fiscal_year: number
  budget_type: string
  planned_amount: number
  notes: string | null
}

interface BudgetFormProps {
  assets: Asset[]
  budget?: Budget
}

const BUDGET_TYPE_OPTIONS = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'parts', label: 'Parts' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'capital', label: 'Capital' },
  { value: 'total', label: 'Total' },
]

export default function BudgetForm({ assets, budget }: BudgetFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentYear = new Date().getFullYear()

  const assetOptions = [
    { value: '', label: 'No specific asset' },
    ...assets.map((a) => ({
      value: a.id,
      label: `${a.name}${a.asset_tag ? ` (${a.asset_tag})` : ''}`,
    })),
  ]

  const [form, setForm] = useState({
    name: budget?.name ?? '',
    asset_id: budget?.asset_id ?? '',
    department: budget?.department ?? '',
    fiscal_year: budget?.fiscal_year?.toString() ?? currentYear.toString(),
    budget_type: budget?.budget_type ?? 'maintenance',
    planned_amount: budget?.planned_amount?.toString() ?? '',
    notes: budget?.notes ?? '',
  })

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.fiscal_year || !form.planned_amount) {
      setError('Name, fiscal year, and planned amount are required.')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      name: form.name,
      asset_id: form.asset_id || null,
      department: form.department || null,
      fiscal_year: parseInt(form.fiscal_year),
      budget_type: form.budget_type,
      planned_amount: parseFloat(form.planned_amount),
      notes: form.notes || null,
    }

    let result
    if (budget) {
      result = await supabase.from('budgets').update(payload).eq('id', budget.id)
    } else {
      result = await supabase.from('budgets').insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    router.push('/budgets')
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
            <Input label="Budget Name *" value={form.name} onChange={set('name')} placeholder="e.g. 2026 Preventive Maintenance" />
          </div>
          <Select label="Asset (optional)" value={form.asset_id} onChange={set('asset_id')} options={assetOptions} />
          <Input label="Department" value={form.department} onChange={set('department')} placeholder="e.g. Facilities, Production" />
          <Input
            label="Fiscal Year *"
            type="number"
            value={form.fiscal_year}
            onChange={set('fiscal_year')}
            min="2000"
            max="2100"
          />
          <Select label="Budget Type *" value={form.budget_type} onChange={set('budget_type')} options={BUDGET_TYPE_OPTIONS} />
          <Input
            label="Planned Amount ($) *"
            type="number"
            value={form.planned_amount}
            onChange={set('planned_amount')}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Budget details, breakdown, assumptions..." />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>
            {budget ? 'Update Budget' : 'Add Budget'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
