import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import CalibrationForm from '../CalibrationForm'
import { ASSET_PICKER_COLUMNS } from '@/lib/assetPicker'

export const dynamic = 'force-dynamic'

export default async function NewCalibrationPage() {
  const supabase = await createClient()
  const { data: assets } = await supabase.from('assets').select(ASSET_PICKER_COLUMNS).order('name')

  return (
    <div>
      <Header title="Add Calibration Record" subtitle="Log a new calibration for an asset" />
      <div className="p-6">
        <CalibrationForm assets={assets ?? []} />
      </div>
    </div>
  )
}
