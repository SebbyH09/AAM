'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Bell, Plus, Send, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { NotificationRule, NotificationLog } from '@/types/database'

interface NotificationsClientProps {
  rules: NotificationRule[]
  logs: NotificationLog[]
}

const TYPE_OPTIONS = [
  { value: 'contract_expiry', label: 'Contract Expiry' },
  { value: 'maintenance_due', label: 'Maintenance Due' },
  { value: 'repair_overdue', label: 'Repair Overdue' },
  { value: 'inspection_due', label: 'Inspection Due' },
]

export default function NotificationsClient({ rules: initialRules, logs }: NotificationsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [rules, setRules] = useState(initialRules)
  const [showAddModal, setShowAddModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    type: 'contract_expiry',
    days_before: '30',
    email_to: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email_to) { setError('Name and email are required.'); return }
    setSaving(true)
    setError('')

    const emails = form.email_to.split(',').map((e) => e.trim()).filter(Boolean)
    const { data, error } = await supabase.from('notification_rules').insert({
      name: form.name,
      type: form.type as NotificationRule['type'],
      days_before: parseInt(form.days_before),
      email_to: emails,
      is_active: true,
    }).select().single()

    if (error) { setError(error.message); setSaving(false); return }
    setRules((prev) => [...prev, data])
    setShowAddModal(false)
    setForm({ name: '', type: 'contract_expiry', days_before: '30', email_to: '' })
    setSaving(false)
  }

  async function toggleRule(rule: NotificationRule) {
    await supabase.from('notification_rules').update({ is_active: !rule.is_active }).eq('id', rule.id)
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
  }

  async function deleteRule(id: string) {
    await supabase.from('notification_rules').delete().eq('id', id)
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  async function sendNotifications() {
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/notifications/send', { method: 'POST' })
      const data = await res.json()
      setSendResult(data.message ?? 'Notifications sent')
    } catch {
      setSendResult('Failed to send notifications')
    }
    setSending(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={sendNotifications} loading={sending} variant="outline">
            <Send className="h-4 w-4" />
            Send Pending Notifications
          </Button>
          {sendResult && (
            <span className="text-sm text-gray-600">{sendResult}</span>
          )}
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {/* Rules */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Notification Rules</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Configure when and how email alerts are sent. Trigger manually or schedule via a cron job at{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">/api/notifications/send</code>
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {rules.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">No notification rules configured.</p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                    <Badge className={rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {rule.type.replace(/_/g, ' ')} • {rule.days_before === 0 ? 'On the day' : `${rule.days_before} days before`}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Recipients: {rule.email_to.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRule(rule)}
                    className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                      rule.is_active
                        ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {rule.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Notification Log */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Notification History</h2>
          <p className="mt-1 text-sm text-gray-500">Recent notifications sent (last 50)</p>
        </div>
        <div className="divide-y divide-gray-100">
          {logs.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">No notifications sent yet.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  {log.status === 'sent' ? (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{log.subject}</p>
                    <p className="text-xs text-gray-500">To: {log.recipient} • {formatDateTime(log.sent_at)}</p>
                  </div>
                </div>
                <Badge className={log.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {log.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Rule Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Notification Rule" size="sm">
        <form onSubmit={handleSaveRule} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <Input label="Rule Name *" value={form.name} onChange={set('name')} placeholder="e.g. Contract Expiry Alert" />
          <Select label="Trigger Type" value={form.type} onChange={set('type')} options={TYPE_OPTIONS} />
          <Input
            label="Days Before *"
            type="number"
            value={form.days_before}
            onChange={set('days_before')}
            min="0"
            hint="Use 0 to send on the due date itself"
          />
          <Input
            label="Email Recipients *"
            value={form.email_to}
            onChange={set('email_to')}
            placeholder="email@example.com, other@example.com"
            hint="Comma-separated email addresses"
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving}>Save Rule</Button>
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
