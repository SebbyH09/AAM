'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Bell, Plus, Send, Trash2, CheckCircle, XCircle, Search } from 'lucide-react'
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

const TYPE_FILTERS = ['all', 'contract_expiry', 'maintenance_due', 'repair_overdue', 'inspection_due']
const LOG_STATUS_FILTERS = ['all', 'sent', 'failed']

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

  // Filter state
  const [ruleSearch, setRuleSearch] = useState('')
  const [ruleTypeFilter, setRuleTypeFilter] = useState('all')
  const [logSearch, setLogSearch] = useState('')
  const [logStatusFilter, setLogStatusFilter] = useState('all')

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchSearch =
        ruleSearch === '' ||
        r.name.toLowerCase().includes(ruleSearch.toLowerCase()) ||
        r.email_to.some((e) => e.toLowerCase().includes(ruleSearch.toLowerCase()))
      const matchType = ruleTypeFilter === 'all' || r.type === ruleTypeFilter
      return matchSearch && matchType
    })
  }, [rules, ruleSearch, ruleTypeFilter])

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchSearch =
        logSearch === '' ||
        l.subject.toLowerCase().includes(logSearch.toLowerCase()) ||
        l.recipient.toLowerCase().includes(logSearch.toLowerCase())
      const matchStatus = logStatusFilter === 'all' || l.status === logStatusFilter
      return matchSearch && matchStatus
    })
  }, [logs, logSearch, logStatusFilter])

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

        {/* Rule Filters */}
        <div className="border-b border-gray-100 px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search rules..."
              value={ruleSearch}
              onChange={(e) => setRuleSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t}
                onClick={() => setRuleTypeFilter(t)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  ruleTypeFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredRules.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              {rules.length === 0 ? 'No notification rules configured.' : 'No rules match your filters.'}
            </p>
          ) : (
            filteredRules.map((rule) => (
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

        {/* Log Filters */}
        <div className="border-b border-gray-100 px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {LOG_STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setLogStatusFilter(s)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  logStatusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredLogs.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              {logs.length === 0 ? 'No notifications sent yet.' : 'No logs match your filters.'}
            </p>
          ) : (
            filteredLogs.map((log) => (
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
