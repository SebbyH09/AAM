'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Plus, CheckCircle2 } from 'lucide-react'

type ItemType =
  | ''
  | 'asset'
  | 'service_contract'
  | 'maintenance_plan'
  | 'repair'
  | 'part'
  | 'vendor'
  | 'calibration'
  | 'budget'

interface SimpleAsset {
  id: string
  name: string
  asset_tag: string | null
}

// ---- Select option constants ----

const ITEM_TYPE_OPTIONS = [
  { value: '', label: 'Select item type...' },
  { value: 'asset', label: 'Asset' },
  { value: 'service_contract', label: 'Service Contract' },
  { value: 'maintenance_plan', label: 'Maintenance Plan' },
  { value: 'repair', label: 'Repair / Work Order' },
  { value: 'part', label: 'Part (Inventory)' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'calibration', label: 'Calibration Record' },
  { value: 'budget', label: 'Budget' },
]

const ASSET_CATEGORY_OPTIONS = [
  { value: '', label: 'Select category...' },
  { value: 'Analytical', label: 'Analytical' },
  { value: 'Lab Equipment', label: 'Lab Equipment' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'IT/Network', label: 'IT/Network' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Mechanical', label: 'Mechanical' },
  { value: 'Other', label: 'Other' },
]

const ASSET_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'repair', label: 'In Repair' },
  { value: 'decommissioned', label: 'Decommissioned' },
]

const CONTRACT_TYPE_OPTIONS = [
  { value: 'full_service', label: 'Full Service' },
  { value: 'preventive_only', label: 'Preventive Only' },
  { value: 'time_and_material', label: 'Time & Material' },
  { value: 'warranty', label: 'Warranty' },
]

const CONTRACT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'expired', label: 'Expired' },
]

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const REPAIR_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_parts', label: 'Waiting for Parts' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PART_CATEGORY_OPTIONS = [
  { value: '', label: 'Select category' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'filter', label: 'Filter' },
  { value: 'lubricant', label: 'Lubricant' },
  { value: 'other', label: 'Other' },
]

const UOM_OPTIONS = [
  { value: 'each', label: 'Each' },
  { value: 'box', label: 'Box' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'liter', label: 'Liter' },
  { value: 'meter', label: 'Meter' },
  { value: 'set', label: 'Set' },
]

const VENDOR_CATEGORY_OPTIONS = [
  { value: '', label: 'Select category' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'parts_supplier', label: 'Parts Supplier' },
  { value: 'service', label: 'Service' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'software', label: 'Software' },
  { value: 'other', label: 'Other' },
]

const CALIBRATION_RESULT_OPTIONS = [
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'out_of_tolerance', label: 'Out of Tolerance' },
  { value: 'adjusted', label: 'Adjusted' },
]

const BUDGET_TYPE_OPTIONS = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'parts', label: 'Parts' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'capital', label: 'Capital' },
  { value: 'total', label: 'Total' },
]

// ---- Default form states ----

const today = () => new Date().toISOString().split('T')[0]
const currentYear = () => new Date().getFullYear().toString()

function defaultAssetForm() {
  return { name: '', asset_tag: '', category: '', manufacturer: '', model: '', serial_number: '', location: '', status: 'active', purchase_date: '', purchase_cost: '', notes: '' }
}
function defaultContractForm() {
  return { asset_id: '', vendor_name: '', contract_number: '', vendor_contact: '', vendor_email: '', vendor_phone: '', contract_type: 'full_service', start_date: '', end_date: '', cost: '', status: 'active', coverage_details: '', pm_last_performed_date: '', pm_interval_months: '12', notes: '' }
}
function defaultMaintenanceForm() {
  return { asset_id: '', name: '', description: '', frequency: 'monthly', next_due_date: '', priority: 'medium', assigned_to: '', estimated_duration_hours: '', estimated_cost: '' }
}
function defaultRepairForm() {
  return { asset_id: '', repair_number: '', reported_by: '', reported_date: today(), description: '', priority: 'medium', status: 'open', assigned_to: '', vendor: '', notes: '' }
}
function defaultPartForm() {
  return { name: '', part_number: '', category: '', unit_of_measure: 'each', quantity_on_hand: '0', unit_cost: '', location: '', reorder_point: '', notes: '' }
}
function defaultVendorForm() {
  return { name: '', category: '', contact_name: '', email: '', phone: '', website: '', address: '', notes: '' }
}
function defaultCalibrationForm() {
  return { asset_id: '', calibration_date: today(), next_due_date: '', performed_by: '', result: 'pass', calibration_standard: '', certificate_number: '', notes: '' }
}
function defaultBudgetForm() {
  return { name: '', asset_id: '', department: '', fiscal_year: currentYear(), budget_type: 'maintenance', planned_amount: '', notes: '' }
}

export default function DashboardNewItemModal() {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [itemType, setItemType] = useState<ItemType>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [assets, setAssets] = useState<SimpleAsset[]>([])

  // form states per type
  const [assetForm, setAssetForm] = useState(defaultAssetForm())
  const [contractForm, setContractForm] = useState(defaultContractForm())
  const [maintenanceForm, setMaintenanceForm] = useState(defaultMaintenanceForm())
  const [repairForm, setRepairForm] = useState(defaultRepairForm())
  const [partForm, setPartForm] = useState(defaultPartForm())
  const [vendorForm, setVendorForm] = useState(defaultVendorForm())
  const [calibrationForm, setCalibrationForm] = useState(defaultCalibrationForm())
  const [budgetForm, setBudgetForm] = useState(defaultBudgetForm())

  useEffect(() => {
    if (open) {
      supabase.from('assets').select('id, name, asset_tag').order('name').then(({ data }) => {
        if (data) setAssets(data)
      })
    }
  }, [open])

  function handleOpen() {
    setOpen(true)
    setItemType('')
    setError('')
    setSuccess(false)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    setItemType('')
    setError('')
    setSuccess(false)
    // reset all forms
    setAssetForm(defaultAssetForm())
    setContractForm(defaultContractForm())
    setMaintenanceForm(defaultMaintenanceForm())
    setRepairForm(defaultRepairForm())
    setPartForm(defaultPartForm())
    setVendorForm(defaultVendorForm())
    setCalibrationForm(defaultCalibrationForm())
    setBudgetForm(defaultBudgetForm())
  }

  function setA(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setAssetForm((p) => ({ ...p, [field]: e.target.value }))
  }
  function setC(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setContractForm((p) => ({ ...p, [field]: e.target.value }))
  }
  function setM(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setMaintenanceForm((p) => ({ ...p, [field]: e.target.value }))
  }
  function setR(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setRepairForm((p) => ({ ...p, [field]: e.target.value }))
  }
  function setP(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setPartForm((p) => ({ ...p, [field]: e.target.value }))
  }
  function setV(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setVendorForm((p) => ({ ...p, [field]: e.target.value }))
  }
  function setK(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setCalibrationForm((p) => ({ ...p, [field]: e.target.value }))
  }
  function setB(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setBudgetForm((p) => ({ ...p, [field]: e.target.value }))
  }

  const assetOptions = [
    { value: '', label: 'No asset' },
    ...assets.map((a) => ({ value: a.id, label: `${a.name}${a.asset_tag ? ` (${a.asset_tag})` : ''}` })),
  ]

  const assetOptionsRequired = [
    { value: '', label: 'Select asset...' },
    ...assets.map((a) => ({ value: a.id, label: `${a.name}${a.asset_tag ? ` (${a.asset_tag})` : ''}` })),
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    try {
      setLoading(true)

      if (itemType === 'asset') {
        if (!assetForm.name || !assetForm.category) {
          setError('Name and category are required.')
          setLoading(false)
          return
        }
        const { error } = await supabase.from('assets').insert({
          name: assetForm.name,
          asset_tag: assetForm.asset_tag || null,
          category: assetForm.category,
          manufacturer: assetForm.manufacturer || null,
          model: assetForm.model || null,
          serial_number: assetForm.serial_number || null,
          location: assetForm.location || null,
          status: assetForm.status,
          purchase_date: assetForm.purchase_date || null,
          purchase_cost: assetForm.purchase_cost ? parseFloat(assetForm.purchase_cost) : null,
          notes: assetForm.notes || null,
        })
        if (error) throw error

      } else if (itemType === 'service_contract') {
        if (!contractForm.vendor_name || !contractForm.start_date || !contractForm.end_date) {
          setError('Vendor name, start date, and end date are required.')
          setLoading(false)
          return
        }
        const payload: any = {
          asset_id: contractForm.asset_id || null,
          vendor_name: contractForm.vendor_name,
          contract_number: contractForm.contract_number || null,
          vendor_contact: contractForm.vendor_contact || null,
          vendor_email: contractForm.vendor_email || null,
          vendor_phone: contractForm.vendor_phone || null,
          contract_type: contractForm.contract_type,
          start_date: contractForm.start_date,
          end_date: contractForm.end_date,
          cost: contractForm.cost ? parseFloat(contractForm.cost) : null,
          status: contractForm.status,
          coverage_details: contractForm.coverage_details || null,
          pm_last_performed_date: contractForm.pm_last_performed_date || null,
          pm_interval_months: contractForm.pm_interval_months ? parseInt(contractForm.pm_interval_months) : 12,
          notes: contractForm.notes || null,
        }
        const { data, error } = await supabase.from('service_contracts').insert(payload).select('id').single()
        if (error) throw error
        // Link asset to junction table if selected
        if (data && contractForm.asset_id) {
          await supabase.from('service_contract_assets').insert({
            service_contract_id: data.id,
            asset_id: contractForm.asset_id,
          })
        }

      } else if (itemType === 'maintenance_plan') {
        if (!maintenanceForm.name || !maintenanceForm.next_due_date) {
          setError('Plan name and next due date are required.')
          setLoading(false)
          return
        }
        const { error } = await supabase.from('maintenance_plans').insert({
          asset_id: maintenanceForm.asset_id || null,
          name: maintenanceForm.name,
          description: maintenanceForm.description || null,
          frequency: maintenanceForm.frequency,
          next_due_date: maintenanceForm.next_due_date,
          priority: maintenanceForm.priority,
          assigned_to: maintenanceForm.assigned_to || null,
          estimated_duration_hours: maintenanceForm.estimated_duration_hours ? parseFloat(maintenanceForm.estimated_duration_hours) : null,
          estimated_cost: maintenanceForm.estimated_cost ? parseFloat(maintenanceForm.estimated_cost) : null,
          is_active: true,
        })
        if (error) throw error

      } else if (itemType === 'repair') {
        if (!repairForm.reported_by || !repairForm.description || !repairForm.reported_date) {
          setError('Reported by, date, and description are required.')
          setLoading(false)
          return
        }
        const { error } = await supabase.from('repairs').insert({
          asset_id: repairForm.asset_id || null,
          repair_number: repairForm.repair_number || null,
          reported_by: repairForm.reported_by,
          reported_date: repairForm.reported_date,
          description: repairForm.description,
          priority: repairForm.priority,
          status: repairForm.status,
          assigned_to: repairForm.assigned_to || null,
          vendor: repairForm.vendor || null,
          notes: repairForm.notes || null,
        })
        if (error) throw error

      } else if (itemType === 'part') {
        if (!partForm.name) {
          setError('Part name is required.')
          setLoading(false)
          return
        }
        const { error } = await supabase.from('parts').insert({
          name: partForm.name,
          part_number: partForm.part_number || null,
          category: partForm.category || null,
          unit_of_measure: partForm.unit_of_measure,
          quantity_on_hand: partForm.quantity_on_hand ? parseInt(partForm.quantity_on_hand) : 0,
          unit_cost: partForm.unit_cost ? parseFloat(partForm.unit_cost) : null,
          location: partForm.location || null,
          reorder_point: partForm.reorder_point ? parseInt(partForm.reorder_point) : null,
          notes: partForm.notes || null,
        })
        if (error) throw error

      } else if (itemType === 'vendor') {
        if (!vendorForm.name) {
          setError('Vendor name is required.')
          setLoading(false)
          return
        }
        const { error } = await supabase.from('vendors').insert({
          name: vendorForm.name,
          category: vendorForm.category || null,
          contact_name: vendorForm.contact_name || null,
          email: vendorForm.email || null,
          phone: vendorForm.phone || null,
          website: vendorForm.website || null,
          address: vendorForm.address || null,
          notes: vendorForm.notes || null,
        })
        if (error) throw error

      } else if (itemType === 'calibration') {
        if (!calibrationForm.asset_id || !calibrationForm.calibration_date || !calibrationForm.next_due_date || !calibrationForm.performed_by) {
          setError('Asset, calibration date, next due date, and performed by are required.')
          setLoading(false)
          return
        }
        const { error } = await supabase.from('calibration_records').insert({
          asset_id: calibrationForm.asset_id,
          calibration_date: calibrationForm.calibration_date,
          next_due_date: calibrationForm.next_due_date,
          performed_by: calibrationForm.performed_by,
          result: calibrationForm.result,
          calibration_standard: calibrationForm.calibration_standard || null,
          certificate_number: calibrationForm.certificate_number || null,
          notes: calibrationForm.notes || null,
        })
        if (error) throw error

      } else if (itemType === 'budget') {
        if (!budgetForm.name || !budgetForm.fiscal_year || !budgetForm.planned_amount) {
          setError('Name, fiscal year, and planned amount are required.')
          setLoading(false)
          return
        }
        const { error } = await supabase.from('budgets').insert({
          name: budgetForm.name,
          asset_id: budgetForm.asset_id || null,
          department: budgetForm.department || null,
          fiscal_year: parseInt(budgetForm.fiscal_year),
          budget_type: budgetForm.budget_type,
          planned_amount: parseFloat(budgetForm.planned_amount),
          notes: budgetForm.notes || null,
        })
        if (error) throw error

      } else {
        setError('Please select an item type.')
        setLoading(false)
        return
      }

      setSuccess(true)
      router.refresh()
      setTimeout(() => handleClose(), 1500)
    } catch (err: any) {
      setError(err.message ?? 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const modalTitle = itemType
    ? `New ${ITEM_TYPE_OPTIONS.find((o) => o.value === itemType)?.label ?? 'Item'}`
    : 'New Item'

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        <Plus className="h-4 w-4" />
        New Item
      </button>

      <Modal open={open} onClose={handleClose} title={modalTitle} size="lg">
        {success ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-base font-semibold text-gray-900">
              {ITEM_TYPE_OPTIONS.find((o) => o.value === itemType)?.label ?? 'Item'} created successfully!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}

            {/* Type selector */}
            <Select
              label="Item Type *"
              value={itemType}
              onChange={(e) => {
                setItemType(e.target.value as ItemType)
                setError('')
              }}
              options={ITEM_TYPE_OPTIONS}
            />

            {/* ---- ASSET FORM ---- */}
            {itemType === 'asset' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
                <div className="sm:col-span-2">
                  <Input label="Asset Name *" value={assetForm.name} onChange={setA('name')} placeholder="e.g. HPLC System #1" />
                </div>
                <Input label="Asset Tag / ID" value={assetForm.asset_tag} onChange={setA('asset_tag')} placeholder="e.g. ASSET-001" />
                <Select label="Category *" value={assetForm.category} onChange={setA('category')} options={ASSET_CATEGORY_OPTIONS} />
                <Input label="Manufacturer" value={assetForm.manufacturer} onChange={setA('manufacturer')} placeholder="e.g. Agilent" />
                <Input label="Model" value={assetForm.model} onChange={setA('model')} placeholder="e.g. 1260 Infinity II" />
                <Input label="Serial Number" value={assetForm.serial_number} onChange={setA('serial_number')} placeholder="e.g. DE12345678" />
                <Input label="Location" value={assetForm.location} onChange={setA('location')} placeholder="e.g. Lab Room 204" />
                <Select label="Status" value={assetForm.status} onChange={setA('status')} options={ASSET_STATUS_OPTIONS} />
                <Input label="Purchase Date" type="date" value={assetForm.purchase_date} onChange={setA('purchase_date')} />
                <Input label="Purchase Cost ($)" type="number" value={assetForm.purchase_cost} onChange={setA('purchase_cost')} placeholder="0.00" step="0.01" min="0" />
                <div className="sm:col-span-2">
                  <Textarea label="Notes" value={assetForm.notes} onChange={setA('notes')} placeholder="Additional notes..." />
                </div>
              </div>
            )}

            {/* ---- SERVICE CONTRACT FORM ---- */}
            {itemType === 'service_contract' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
                <div className="sm:col-span-2">
                  <Select label="Linked Asset" value={contractForm.asset_id} onChange={setC('asset_id')} options={assetOptions} />
                </div>
                <Input label="Vendor Name *" value={contractForm.vendor_name} onChange={setC('vendor_name')} placeholder="e.g. Agilent Technologies" />
                <Input label="Contract Number" value={contractForm.contract_number} onChange={setC('contract_number')} placeholder="e.g. SVC-2024-001" />
                <Input label="Vendor Contact" value={contractForm.vendor_contact} onChange={setC('vendor_contact')} placeholder="Contact name" />
                <Input label="Vendor Email" type="email" value={contractForm.vendor_email} onChange={setC('vendor_email')} placeholder="service@vendor.com" />
                <Input label="Vendor Phone" type="tel" value={contractForm.vendor_phone} onChange={setC('vendor_phone')} placeholder="+1 (555) 000-0000" />
                <Select label="Contract Type" value={contractForm.contract_type} onChange={setC('contract_type')} options={CONTRACT_TYPE_OPTIONS} />
                <Input label="Start Date *" type="date" value={contractForm.start_date} onChange={setC('start_date')} />
                <Input label="End Date *" type="date" value={contractForm.end_date} onChange={setC('end_date')} />
                <Input label="Annual Cost ($)" type="number" value={contractForm.cost} onChange={setC('cost')} placeholder="0.00" step="0.01" min="0" />
                <Select label="Status" value={contractForm.status} onChange={setC('status')} options={CONTRACT_STATUS_OPTIONS} />
                <div className="sm:col-span-2">
                  <Textarea label="Coverage Details" value={contractForm.coverage_details} onChange={setC('coverage_details')} placeholder="What does this contract cover?" rows={2} />
                </div>
                <Input label="PM Last Performed" type="date" value={contractForm.pm_last_performed_date} onChange={setC('pm_last_performed_date')} />
                <Input label="PM Interval (months)" type="number" value={contractForm.pm_interval_months} onChange={setC('pm_interval_months')} placeholder="12" min="1" max="60" />
                <div className="sm:col-span-2">
                  <Textarea label="Notes" value={contractForm.notes} onChange={setC('notes')} placeholder="Additional notes..." rows={2} />
                </div>
              </div>
            )}

            {/* ---- MAINTENANCE PLAN FORM ---- */}
            {itemType === 'maintenance_plan' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
                <div className="sm:col-span-2">
                  <Select label="Asset" value={maintenanceForm.asset_id} onChange={setM('asset_id')} options={assetOptions} />
                </div>
                <div className="sm:col-span-2">
                  <Input label="Plan Name *" value={maintenanceForm.name} onChange={setM('name')} placeholder="e.g. Monthly Filter Replacement" />
                </div>
                <div className="sm:col-span-2">
                  <Textarea label="Description" value={maintenanceForm.description} onChange={setM('description')} placeholder="Describe what this maintenance involves..." rows={2} />
                </div>
                <Select label="Frequency" value={maintenanceForm.frequency} onChange={setM('frequency')} options={FREQUENCY_OPTIONS} />
                <Input label="Next Due Date *" type="date" value={maintenanceForm.next_due_date} onChange={setM('next_due_date')} />
                <Select label="Priority" value={maintenanceForm.priority} onChange={setM('priority')} options={PRIORITY_OPTIONS} />
                <Input label="Assigned To" value={maintenanceForm.assigned_to} onChange={setM('assigned_to')} placeholder="Technician or team" />
                <Input label="Est. Duration (hours)" type="number" value={maintenanceForm.estimated_duration_hours} onChange={setM('estimated_duration_hours')} placeholder="0.0" step="0.5" min="0" />
                <Input label="Est. Cost ($)" type="number" value={maintenanceForm.estimated_cost} onChange={setM('estimated_cost')} placeholder="0.00" step="0.01" min="0" />
              </div>
            )}

            {/* ---- REPAIR FORM ---- */}
            {itemType === 'repair' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
                <div className="sm:col-span-2">
                  <Select label="Asset" value={repairForm.asset_id} onChange={setR('asset_id')} options={assetOptions} />
                </div>
                <Input label="Repair Number" value={repairForm.repair_number} onChange={setR('repair_number')} placeholder="e.g. REP-2024-001" />
                <Input label="Reported By *" value={repairForm.reported_by} onChange={setR('reported_by')} placeholder="Name" />
                <Input label="Reported Date *" type="date" value={repairForm.reported_date} onChange={setR('reported_date')} />
                <Select label="Priority" value={repairForm.priority} onChange={setR('priority')} options={PRIORITY_OPTIONS} />
                <div className="sm:col-span-2">
                  <Textarea label="Description *" value={repairForm.description} onChange={setR('description')} placeholder="Describe the issue..." rows={2} />
                </div>
                <Select label="Status" value={repairForm.status} onChange={setR('status')} options={REPAIR_STATUS_OPTIONS} />
                <Input label="Assigned To" value={repairForm.assigned_to} onChange={setR('assigned_to')} placeholder="Technician or vendor" />
                <div className="sm:col-span-2">
                  <Input label="Vendor / Service Provider" value={repairForm.vendor} onChange={setR('vendor')} placeholder="Company name" />
                </div>
                <div className="sm:col-span-2">
                  <Textarea label="Notes" value={repairForm.notes} onChange={setR('notes')} placeholder="Additional notes..." rows={2} />
                </div>
              </div>
            )}

            {/* ---- PART FORM ---- */}
            {itemType === 'part' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
                <div className="sm:col-span-2">
                  <Input label="Part Name *" value={partForm.name} onChange={setP('name')} placeholder="e.g. HEPA Filter" />
                </div>
                <Input label="Part Number" value={partForm.part_number} onChange={setP('part_number')} placeholder="e.g. HF-2024-001" />
                <Select label="Category" value={partForm.category} onChange={setP('category')} options={PART_CATEGORY_OPTIONS} />
                <Select label="Unit of Measure" value={partForm.unit_of_measure} onChange={setP('unit_of_measure')} options={UOM_OPTIONS} />
                <Input label="Quantity On Hand" type="number" value={partForm.quantity_on_hand} onChange={setP('quantity_on_hand')} placeholder="0" min="0" />
                <Input label="Unit Cost ($)" type="number" value={partForm.unit_cost} onChange={setP('unit_cost')} placeholder="0.00" step="0.01" min="0" />
                <Input label="Reorder Point" type="number" value={partForm.reorder_point} onChange={setP('reorder_point')} placeholder="e.g. 5" min="0" />
                <div className="sm:col-span-2">
                  <Input label="Storage Location" value={partForm.location} onChange={setP('location')} placeholder="e.g. Shelf B-3" />
                </div>
                <div className="sm:col-span-2">
                  <Textarea label="Notes" value={partForm.notes} onChange={setP('notes')} placeholder="Additional notes..." rows={2} />
                </div>
              </div>
            )}

            {/* ---- VENDOR FORM ---- */}
            {itemType === 'vendor' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
                <div className="sm:col-span-2">
                  <Input label="Vendor Name *" value={vendorForm.name} onChange={setV('name')} placeholder="e.g. Agilent Technologies" />
                </div>
                <Select label="Category" value={vendorForm.category} onChange={setV('category')} options={VENDOR_CATEGORY_OPTIONS} />
                <Input label="Contact Name" value={vendorForm.contact_name} onChange={setV('contact_name')} placeholder="Primary contact" />
                <Input label="Email" type="email" value={vendorForm.email} onChange={setV('email')} placeholder="contact@vendor.com" />
                <Input label="Phone" type="tel" value={vendorForm.phone} onChange={setV('phone')} placeholder="+1 (555) 000-0000" />
                <Input label="Website" type="url" value={vendorForm.website} onChange={setV('website')} placeholder="https://vendor.com" />
                <div className="sm:col-span-2">
                  <Input label="Address" value={vendorForm.address} onChange={setV('address')} placeholder="123 Main St, City, State" />
                </div>
                <div className="sm:col-span-2">
                  <Textarea label="Notes" value={vendorForm.notes} onChange={setV('notes')} placeholder="Additional notes..." rows={2} />
                </div>
              </div>
            )}

            {/* ---- CALIBRATION FORM ---- */}
            {itemType === 'calibration' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
                <div className="sm:col-span-2">
                  <Select label="Asset *" value={calibrationForm.asset_id} onChange={setK('asset_id')} options={assetOptionsRequired} />
                </div>
                <Input label="Calibration Date *" type="date" value={calibrationForm.calibration_date} onChange={setK('calibration_date')} />
                <Input label="Next Due Date *" type="date" value={calibrationForm.next_due_date} onChange={setK('next_due_date')} />
                <Input label="Performed By *" value={calibrationForm.performed_by} onChange={setK('performed_by')} placeholder="Technician name" />
                <Select label="Result" value={calibrationForm.result} onChange={setK('result')} options={CALIBRATION_RESULT_OPTIONS} />
                <Input label="Calibration Standard" value={calibrationForm.calibration_standard} onChange={setK('calibration_standard')} placeholder="e.g. NIST traceable" />
                <Input label="Certificate Number" value={calibrationForm.certificate_number} onChange={setK('certificate_number')} placeholder="e.g. CAL-2024-001" />
                <div className="sm:col-span-2">
                  <Textarea label="Notes" value={calibrationForm.notes} onChange={setK('notes')} placeholder="Additional notes..." rows={2} />
                </div>
              </div>
            )}

            {/* ---- BUDGET FORM ---- */}
            {itemType === 'budget' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
                <div className="sm:col-span-2">
                  <Input label="Budget Name *" value={budgetForm.name} onChange={setB('name')} placeholder="e.g. FY2024 Maintenance Budget" />
                </div>
                <Input label="Fiscal Year *" type="number" value={budgetForm.fiscal_year} onChange={setB('fiscal_year')} placeholder="2024" min="2000" max="2100" />
                <Select label="Budget Type" value={budgetForm.budget_type} onChange={setB('budget_type')} options={BUDGET_TYPE_OPTIONS} />
                <Input label="Planned Amount ($) *" type="number" value={budgetForm.planned_amount} onChange={setB('planned_amount')} placeholder="0.00" step="0.01" min="0" />
                <Input label="Department" value={budgetForm.department} onChange={setB('department')} placeholder="e.g. Facilities" />
                <div className="sm:col-span-2">
                  <Select label="Linked Asset (optional)" value={budgetForm.asset_id} onChange={setB('asset_id')} options={assetOptions} />
                </div>
                <div className="sm:col-span-2">
                  <Textarea label="Notes" value={budgetForm.notes} onChange={setB('notes')} placeholder="Additional notes..." rows={2} />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Button type="submit" loading={loading} disabled={!itemType}>
                {itemType ? `Create ${ITEM_TYPE_OPTIONS.find((o) => o.value === itemType)?.label ?? 'Item'}` : 'Create Item'}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
