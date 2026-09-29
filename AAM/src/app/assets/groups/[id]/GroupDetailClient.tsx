'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { AssetPicker, PickerAsset } from '@/components/AssetPicker'
import { formatDate, statusColor } from '@/lib/utils'
import { Asset, AssetGroup } from '@/types/database'
import { ChevronRight, Edit, Layers, MapPin, Plus, Trash2, Unlink } from 'lucide-react'

interface GroupDetailClientProps {
  group: AssetGroup
  members: Asset[]
  allAssets: (PickerAsset & { group_id: string | null })[]
}

export default function GroupDetailClient({ group, members, allAssets }: GroupDetailClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description ?? '')
  const [pickerValue, setPickerValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const candidates = allAssets.filter((a) => a.group_id !== group.id)
  const locations = [...new Set(members.map((m) => m.location).filter(Boolean))]
  const statuses = [...new Set(members.map((m) => m.status))]
  // A unit is only as healthy as its weakest piece.
  const unitStatus = (['repair', 'inactive', 'decommissioned', 'active'] as const).find((s) => statuses.includes(s))

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>, after?: () => void) {
    setBusy(true)
    setError('')
    const { error } = await action()
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    after?.()
    router.refresh()
  }

  function saveDetails(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    run(
      () => supabase.from('asset_groups').update({ name: name.trim(), description: description.trim() || null }).eq('id', group.id),
      () => setEditOpen(false),
    )
  }

  function addAsset(assetId: string) {
    setPickerValue(assetId)
    if (!assetId) return
    const asset = allAssets.find((a) => a.id === assetId)
    if (asset?.group_id && !confirm(`${asset.name} is already in another group. Move it to ${group.name}?`)) {
      setPickerValue('')
      return
    }
    run(
      () => supabase.from('assets').update({ group_id: group.id }).eq('id', assetId),
      () => setPickerValue(''),
    )
  }

  function removeAsset(asset: Asset) {
    run(() => supabase.from('assets').update({ group_id: null }).eq('id', asset.id))
  }

  async function deleteGroup() {
    if (!confirm(`Delete the group "${group.name}"? Its ${members.length} asset${members.length === 1 ? '' : 's'} will be kept, just no longer grouped.`)) return
    setBusy(true)
    const { error } = await supabase.from('asset_groups').delete().eq('id', group.id)
    if (error) {
      setBusy(false)
      setError(error.message)
      return
    }
    router.push('/assets')
    router.refresh()
  }

  return (
    <>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Summary */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Layers className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
              {group.description ? (
                <p className="mt-0.5 text-sm text-gray-600 whitespace-pre-line">{group.description}</p>
              ) : (
                <p className="mt-0.5 text-sm text-gray-400">No description</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span>{members.length} piece{members.length === 1 ? '' : 's'}</span>
                {unitStatus && <Badge className={statusColor(unitStatus)}>{unitStatus}</Badge>}
                {locations.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {locations.join(', ')}
                  </span>
                )}
                <span>Created {formatDate(group.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setName(group.name); setDescription(group.description ?? ''); setEditOpen(true) }}>
              <Edit className="h-4 w-4" /> Edit
            </Button>
            <Button variant="danger" size="sm" onClick={deleteGroup} disabled={busy}>
              <Trash2 className="h-4 w-4" /> Delete group
            </Button>
          </div>
        </div>
      </section>

      {/* Members */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-gray-900">Assets in this group</h2>
          <Link
            href={`/assets/new?group=${group.id}`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-4 w-4" /> New asset in this group
          </Link>
        </div>

        {members.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-400">No assets yet. Add existing assets below.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Serial #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => router.push(`/assets/${asset.id}`)}
                    className="cursor-pointer transition-colors hover:bg-blue-50"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                      <p className="text-xs text-gray-500">
                        {[asset.asset_tag, asset.manufacturer, asset.model].filter(Boolean).join(' • ')}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-600">{asset.serial_number ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{asset.category}</td>
                    <td className="px-6 py-4">
                      <Badge className={statusColor(asset.status)}>{asset.status}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); removeAsset(asset) }}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600"
                          title="Remove from group (the asset is kept)"
                        >
                          <Unlink className="h-3.5 w-3.5" /> Remove
                        </button>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-gray-200 px-6 py-4">
          <AssetPicker
            assets={candidates}
            value={pickerValue}
            onChange={addAsset}
            label="Add an existing asset"
            placeholder="Search for an asset to add..."
            modalTitle={`Add an asset to ${group.name}`}
            disabled={busy}
          />
        </div>
      </section>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit group">
        <form onSubmit={saveDetails} className="space-y-4">
          <Input label="Group Name *" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>Save</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
