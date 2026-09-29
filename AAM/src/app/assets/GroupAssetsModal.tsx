'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Asset, AssetGroup } from '@/types/database'
import { cn } from '@/lib/utils'

interface GroupAssetsModalProps {
  open: boolean
  onClose: () => void
  assets: Asset[]
  groups: AssetGroup[]
  onDone: () => void
}

export default function GroupAssetsModal({ open, onClose, assets, groups, onDone }: GroupAssetsModalProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'new' | 'existing'>(groups.length > 0 ? 'existing' : 'new')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [groupId, setGroupId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const groupsById = new Map(groups.map((g) => [g.id, g]))
  const moving = assets.filter((a) => a.group_id && a.group_id !== (mode === 'existing' ? groupId : ''))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'new' && !name.trim()) {
      setError('Give the group a name.')
      return
    }
    if (mode === 'existing' && !groupId) {
      setError('Choose a group.')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()

    let targetId = groupId
    if (mode === 'new') {
      const { data, error } = await supabase
        .from('asset_groups')
        .insert({ name: name.trim(), description: description.trim() || null })
        .select('id')
        .single()
      if (error || !data) {
        setError(error?.message ?? 'Could not create the group.')
        setSaving(false)
        return
      }
      targetId = data.id
    }

    const { error } = await supabase
      .from('assets')
      .update({ group_id: targetId })
      .in('id', assets.map((a) => a.id))
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }

    setName('')
    setDescription('')
    setGroupId('')
    onDone()
    router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Group ${assets.length} asset${assets.length === 1 ? '' : 's'}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
          {(['new', 'existing'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              disabled={m === 'existing' && groups.length === 0}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {m === 'new' ? 'New group' : 'Add to existing'}
            </button>
          ))}
        </div>

        {mode === 'new' ? (
          <>
            <Input label="Group Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. LC Stack #1" autoFocus />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Agilent 1260 pump, autosampler, column oven and DAD in Lab 204"
            />
          </>
        ) : (
          <Select
            label="Group *"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            options={[{ value: '', label: 'Select a group...' }, ...groups.map((g) => ({ value: g.id, label: g.name }))]}
          />
        )}

        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">Assets</p>
          <ul className="max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
            {assets.map((a) => (
              <li key={a.id} className="hover-row px-3 py-2 text-sm">
                <p className="font-medium text-gray-900">{a.name}</p>
                <p className="text-xs text-gray-500">
                  {[a.asset_tag, a.model, a.serial_number].filter(Boolean).join(' • ') || a.category}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {moving.length > 0 && (
          <p className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
            {moving.length === 1 ? '1 asset is' : `${moving.length} assets are`} already in another group
            ({[...new Set(moving.map((a) => groupsById.get(a.group_id!)?.name).filter(Boolean))].join(', ')}) and will be moved.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{mode === 'new' ? 'Create group' : 'Add to group'}</Button>
        </div>
      </form>
    </Modal>
  )
}
