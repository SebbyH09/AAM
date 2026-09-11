import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import CalibrationForm from '../../CalibrationForm'
import { notFound } from 'next/navigation'
import { ASSET_PICKER_COLUMNS } from '@/lib/assetPicker'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCalibrationPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: calibration }, { data: assets }] = await Promise.all([
    supabase.from('calibration_records').select('*').eq('id', id).single(),
    supabase.from('assets').select(ASSET_PICKER_COLUMNS).order('name'),
  ])

  if (!calibration) notFound()

  return (
    <div>
      <Header title="Edit Calibration" subtitle={`${calibration.calibration_date} — ${calibration.result}`} />
      <div className="p-6">
        <CalibrationForm assets={assets ?? []} calibration={calibration} />
      </div>
    </div>
  )
}
