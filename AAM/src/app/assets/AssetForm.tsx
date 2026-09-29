'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Asset, AssetGroup } from '@/types/database'
import { useAssetCategories } from '@/hooks/useAssetCategories'
import { ChevronDown, ChevronRight } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'repair', label: 'In Repair' },
  { value: 'decommissioned', label: 'Decommissioned' },
]

const NEW_GROUP = '__new__'

interface AssetFormProps {
  asset?: Asset
  groups?: AssetGroup[]
  /** Pre-selects a group, e.g. when adding a new piece from a group's page. */
  defaultGroupId?: string
}

export default function AssetForm({ asset, groups = [], defaultGroupId }: AssetFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const categories = useAssetCategories()
  const categoryOptions = [
    { value: '', label: 'Select category...' },
    ...categories.map((c) => ({ value: c, label: c })),
    // Keep an asset's current category selectable even if it was removed in Settings.
    ...(asset?.category && !categories.includes(asset.category)
      ? [{ value: asset.category, label: asset.category }]
      : []),
  ]
  const groupOptions = [
    { value: '', label: 'Not grouped' },
    ...groups.map((g) => ({ value: g.id, label: g.name })),
    { value: NEW_GROUP, label: '+ New group...' },
  ]
  const [newGroupName, setNewGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hasFacilitiesData = !!(asset?.power_requirements || asset?.dimensions || asset?.weight || asset?.internet_requirements || asset?.water_requirements || asset?.air_gas_requirements || asset?.ventilation_requirements || asset?.environmental_requirements || asset?.facilities_notes)
  const [showFacilities, setShowFacilities] = useState(hasFacilitiesData)

  const [form, setForm] = useState({
    name: asset?.name ?? '',
    asset_tag: asset?.asset_tag ?? '',
    category: asset?.category ?? '',
    manufacturer: asset?.manufacturer ?? '',
    model: asset?.model ?? '',
    serial_number: asset?.serial_number ?? '',
    location: asset?.location ?? '',
    status: asset?.status ?? 'active',
    purchase_date: asset?.purchase_date ?? '',
    purchase_cost: asset?.purchase_cost?.toString() ?? '',
    date_installed: asset?.date_installed ?? '',
    notes: asset?.notes ?? '',
    power_requirements: asset?.power_requirements ?? '',
    dimensions: asset?.dimensions ?? '',
    weight: asset?.weight ?? '',
    internet_requirements: asset?.internet_requirements ?? '',
    water_requirements: asset?.water_requirements ?? '',
    air_gas_requirements: asset?.air_gas_requirements ?? '',
    ventilation_requirements: asset?.ventilation_requirements ?? '',
    environmental_requirements: asset?.environmental_requirements ?? '',
    facilities_notes: asset?.facilities_notes ?? '',
    group_id: asset?.group_id ?? defaultGroupId ?? '',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.category) {
      setError('Name and category are required.')
      return
    }
    if (form.group_id === NEW_GROUP && !newGroupName.trim()) {
      setError('Enter a name for the new group.')
      return
    }
    setLoading(true)
    setError('')

    let groupId: string | null = form.group_id || null
    if (form.group_id === NEW_GROUP) {
      const { data: group, error: groupError } = await supabase
        .from('asset_groups')
        .insert({ name: newGroupName.trim() })
        .select('id')
        .single()
      if (groupError || !group) {
        setError(groupError?.message ?? 'Could not create the group.')
        setLoading(false)
        return
      }
      groupId = group.id
    }

    const payload = {
      name: form.name,
      asset_tag: form.asset_tag || null,
      category: form.category,
      manufacturer: form.manufacturer || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      location: form.location || null,
      status: form.status as Asset['status'],
      purchase_date: form.purchase_date || null,
      purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
      date_installed: form.date_installed || null,
      notes: form.notes || null,
      power_requirements: form.power_requirements || null,
      dimensions: form.dimensions || null,
      weight: form.weight || null,
      internet_requirements: form.internet_requirements || null,
      water_requirements: form.water_requirements || null,
      air_gas_requirements: form.air_gas_requirements || null,
      ventilation_requirements: form.ventilation_requirements || null,
      environmental_requirements: form.environmental_requirements || null,
      facilities_notes: form.facilities_notes || null,
      // Only send group_id when grouping is in play, so saving still works on
      // a database that hasn't had the asset groups migration applied yet.
      ...(groupId || asset?.group_id ? { group_id: groupId } : {}),
    }

    let result
    if (asset) {
      result = await supabase.from('assets').update(payload).eq('id', asset.id)
    } else {
      result = await supabase.from('assets').insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    router.push(!asset && defaultGroupId && groupId === defaultGroupId ? `/assets/groups/${groupId}` : '/assets')
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
            <Input label="Asset Name *" value={form.name} onChange={set('name')} placeholder="e.g. HPLC System #1" />
          </div>
          <Input label="Asset Tag / ID" value={form.asset_tag} onChange={set('asset_tag')} placeholder="e.g. ASSET-001" />
          <Select label="Category *" value={form.category} onChange={set('category')} options={categoryOptions} />
          <Input label="Manufacturer" value={form.manufacturer} onChange={set('manufacturer')} placeholder="e.g. Agilent" />
          <Input label="Model" value={form.model} onChange={set('model')} placeholder="e.g. 1260 Infinity II" />
          <Input label="Serial Number" value={form.serial_number} onChange={set('serial_number')} placeholder="e.g. DE12345678" />
          <Input label="Location" value={form.location} onChange={set('location')} placeholder="e.g. Lab Room 204" />
          <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
          <Input label="Purchase Date" type="date" value={form.purchase_date} onChange={set('purchase_date')} />
          <Input label="Purchase Cost ($)" type="number" value={form.purchase_cost} onChange={set('purchase_cost')} placeholder="0.00" step="0.01" min="0" />
          <Input label="Date Installed" type="date" value={form.date_installed} onChange={set('date_installed')} />
          <Select
            label="Group"
            value={form.group_id}
            onChange={set('group_id')}
            options={groupOptions}
            hint="Bundle pieces that work as one unit, e.g. the modules of an LC stack."
          />
          {form.group_id === NEW_GROUP && (
            <Input
              label="New Group Name *"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. LC Stack #1"
            />
          )}
          <div className="sm:col-span-2">
            <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
          </div>
        </div>

        {/* Facilities Information (collapsible) */}
        <div className="border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => setShowFacilities(!showFacilities)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            {showFacilities ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Facilities Information
            <span className="text-xs font-normal text-gray-400">(optional)</span>
          </button>
          {showFacilities && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Power Requirements" value={form.power_requirements} onChange={set('power_requirements')} placeholder="e.g. 208V, 30A, 3-phase, NEMA L6-30" />
              <Input label="Dimensions (L x W x H)" value={form.dimensions} onChange={set('dimensions')} placeholder='e.g. 48" x 24" x 36"' />
              <Input label="Weight" value={form.weight} onChange={set('weight')} placeholder="e.g. 250 lbs" />
              <Input label="Internet / Network" value={form.internet_requirements} onChange={set('internet_requirements')} placeholder="e.g. Ethernet, static IP required" />
              <Input label="Water / Drain" value={form.water_requirements} onChange={set('water_requirements')} placeholder="e.g. DI water supply, 20 PSI min" />
              <Input label="Air / Gases" value={form.air_gas_requirements} onChange={set('air_gas_requirements')} placeholder="e.g. Nitrogen 60 PSI, compressed air 80 PSI" />
              <Input label="Ventilation" value={form.ventilation_requirements} onChange={set('ventilation_requirements')} placeholder="e.g. Fume hood required, 100 CFM exhaust" />
              <Input label="Environmental (Temp / Humidity)" value={form.environmental_requirements} onChange={set('environmental_requirements')} placeholder="e.g. 20-25°C, 30-60% RH" />
              <div className="sm:col-span-2">
                <Textarea label="Facilities Notes" value={form.facilities_notes} onChange={set('facilities_notes')} placeholder="Additional facilities requirements or notes..." />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>
            {asset ? 'Update Asset' : 'Create Asset'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
