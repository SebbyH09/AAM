'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { Clock, Plus, Trash2, X } from 'lucide-react'

interface LaborEntry {
  id: string
  repair_id: string
  technician: string
  work_date: string
  hours: number
  description: string | null
  created_at: string
}

interface LaborLogSectionProps {
  repairId: string
}

export default function LaborLogSection({ repairId }: LaborLogSectionProps) {
  const supabase = createClient()
  const [entries, setEntries] = useState<LaborEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    technician: '',
    work_date: today,
    hours: '',
    description: '',
  })

  async function loadEntries() {
    const { data } = await supabase
      .from('work_order_labor')
      .select('*')
      .eq('repair_id', repairId)
      .order('work_date', { ascending: false })
    setEntries(data ?? [])
  }

  useEffect(() => {
    loadEntries()
  }, [repairId])

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.technician.trim() || !form.hours || !form.work_date) {
      setError('Technician, date, and hours are required.')
      return
    }
    const hours = parseFloat(form.hours)
    if (isNaN(hours) || hours <= 0) {
      setError('Hours must be a positive number.')
      return
    }
    setLoading(true)
    setError('')

    const { error: insertError } = await supabase.from('work_order_labor').insert({
      repair_id: repairId,
      technician: form.technician,
      work_date: form.work_date,
      hours,
      description: form.description || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setForm({ technician: '', work_date: today, hours: '', description: '' })
    setShowForm(false)
    setLoading(false)
    await loadEntries()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this labor entry?')) return
    await supabase.from('work_order_labor').delete().eq('id', id)
    await loadEntries()
  }

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Labor Log</h2>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError('') }}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Entry'}
        </button>
      </div>

      {showForm && (
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input label="Technician *" value={form.technician} onChange={set('technician')} placeholder="Name" />
              <Input label="Work Date *" type="date" value={form.work_date} onChange={set('work_date')} />
              <Input label="Hours *" type="number" value={form.hours} onChange={set('hours')} placeholder="0.0" step="0.25" min="0.25" />
            </div>
            <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Work performed..." rows={2} />
            <div className="flex gap-3 pt-1">
              <Button type="submit" loading={loading} size="sm">Add Entry</Button>
            </div>
          </form>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {entries.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-400">No labor entries logged.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Technician</th>
                  <th className="px-6 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-6 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Hours</th>
                  <th className="px-6 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
                  <th className="relative px-6 py-2"><span className="sr-only">Delete</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{entry.technician}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{formatDate(entry.work_date)}</td>
                    <td className="px-6 py-3 text-sm text-gray-900 font-semibold">{entry.hours}h</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{entry.description ?? '—'}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Total Hours</span>
          <span className="text-sm font-bold text-gray-900">{totalHours.toFixed(2)}h</span>
        </div>
      )}
    </section>
  )
}
