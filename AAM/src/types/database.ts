export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      assets: {
        Row: Asset
        Insert: Omit<Asset, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Asset, 'id' | 'created_at' | 'updated_at'>>
      }
      service_contracts: {
        Row: ServiceContract
        Insert: Omit<ServiceContract, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ServiceContract, 'id' | 'created_at' | 'updated_at'>>
      }
      maintenance_plans: {
        Row: MaintenancePlan
        Insert: Omit<MaintenancePlan, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MaintenancePlan, 'id' | 'created_at' | 'updated_at'>>
      }
      maintenance_records: {
        Row: MaintenanceRecord
        Insert: Omit<MaintenanceRecord, 'id' | 'created_at'>
        Update: Partial<Omit<MaintenanceRecord, 'id' | 'created_at'>>
      }
      repairs: {
        Row: Repair
        Insert: Omit<Repair, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Repair, 'id' | 'created_at' | 'updated_at'>>
      }
      downtime_events: {
        Row: DowntimeEvent
        Insert: Omit<DowntimeEvent, 'id' | 'created_at'>
        Update: Partial<Omit<DowntimeEvent, 'id' | 'created_at'>>
      }
      notification_rules: {
        Row: NotificationRule
        Insert: Omit<NotificationRule, 'id' | 'created_at'>
        Update: Partial<Omit<NotificationRule, 'id' | 'created_at'>>
      }
      notification_log: {
        Row: NotificationLog
        Insert: Omit<NotificationLog, 'id' | 'sent_at'>
        Update: Partial<Omit<NotificationLog, 'id' | 'sent_at'>>
      }
      alternative_items: {
        Row: AlternativeItem
        Insert: Omit<AlternativeItem, 'id' | 'created_at'>
        Update: Partial<Omit<AlternativeItem, 'id' | 'created_at'>>
      }
    }
  }
}

export interface Asset {
  id: string
  name: string
  asset_tag: string | null
  category: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  location: string | null
  status: 'active' | 'inactive' | 'decommissioned' | 'repair'
  purchase_date: string | null
  purchase_cost: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ServiceContract {
  id: string
  asset_id: string | null
  contract_number: string | null
  vendor_name: string
  vendor_contact: string | null
  vendor_email: string | null
  vendor_phone: string | null
  contract_type: 'full_service' | 'preventive_only' | 'time_and_material' | 'warranty'
  start_date: string
  end_date: string
  cost: number | null
  coverage_details: string | null
  file_path: string | null
  file_name: string | null
  file_url: string | null
  status: 'active' | 'expired' | 'pending'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MaintenancePlan {
  id: string
  asset_id: string | null
  name: string
  description: string | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'custom'
  frequency_days: number | null
  last_performed_date: string | null
  next_due_date: string
  assigned_to: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimated_duration_hours: number | null
  checklist: Json | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MaintenanceRecord {
  id: string
  asset_id: string | null
  maintenance_plan_id: string | null
  performed_by: string
  performed_date: string
  duration_hours: number | null
  type: 'preventive' | 'corrective' | 'inspection' | 'calibration' | 'other'
  description: string
  findings: string | null
  parts_replaced: string | null
  cost: number | null
  status: 'completed' | 'incomplete' | 'requires_followup'
  next_maintenance_date: string | null
  notes: string | null
  created_at: string
}

export interface Repair {
  id: string
  asset_id: string | null
  repair_number: string | null
  reported_by: string
  reported_date: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'waiting_parts' | 'completed' | 'cancelled'
  assigned_to: string | null
  vendor: string | null
  started_date: string | null
  completed_date: string | null
  root_cause: string | null
  resolution: string | null
  parts_cost: number | null
  labor_cost: number | null
  total_cost: number | null
  warranty_repair: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DowntimeEvent {
  id: string
  asset_id: string | null
  repair_id: string | null
  start_time: string
  end_time: string | null
  duration_hours: number | null
  reason: 'breakdown' | 'scheduled_maintenance' | 'repair' | 'waiting_parts' | 'operator_error' | 'other'
  description: string | null
  impact: string | null
  cost_impact: number | null
  created_at: string
}

export interface NotificationRule {
  id: string
  name: string
  type: 'contract_expiry' | 'maintenance_due' | 'repair_overdue' | 'inspection_due'
  days_before: number
  email_to: string[]
  is_active: boolean
  created_at: string
}

export interface NotificationLog {
  id: string
  rule_id: string | null
  type: string
  subject: string
  recipient: string
  related_id: string | null
  related_type: string | null
  sent_at: string
  status: 'sent' | 'failed'
}

export interface AlternativeItem {
  id: string
  asset_id: string | null
  name: string
  manufacturer: string | null
  model: string | null
  part_number: string | null
  supplier: string | null
  estimated_cost: number | null
  notes: string | null
  created_at: string
}

// Extended types with joins
export interface AssetWithDetails extends Asset {
  service_contracts?: ServiceContract[]
  maintenance_plans?: MaintenancePlan[]
  repairs?: Repair[]
  downtime_events?: DowntimeEvent[]
}

export interface MaintenancePlanWithAsset extends MaintenancePlan {
  assets?: Asset
}

export interface ServiceContractWithAsset extends ServiceContract {
  assets?: Asset
}

export interface RepairWithAsset extends Repair {
  assets?: Asset
}
