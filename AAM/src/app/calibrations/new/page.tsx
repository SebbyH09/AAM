import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import CalibrationForm from '../CalibrationForm'
import { ASSET_GROUP_PICKER_COLUMNS, ASSET_PICKER_COLUMNS } from '@/lib/assetPicker'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ group?: string }>
}

export default async function NewCalibrationPage({ searchParams }: PageProps) {
  const { group } = await searchParams
  const supabase = await createClient()
  const [{ data: assets }, { data: groups }] = await Promise.all([
    supabase.from('assets').select(ASSET_PICKER_COLUMNS).order('name'),
    supabase.from('asset_groups').select(ASSET_GROUP_PICKER_COLUMNS).order('name'),
  ])

  return (
    <div>
      <Header title="Add Calibration Record" subtitle="Log a new calibration for an asset" />
      <div className="p-6">
        <CalibrationForm assets={assets ?? []} groups={groups ?? []} defaultGroupId={group} />
      </div>
    </div>
  )
}
