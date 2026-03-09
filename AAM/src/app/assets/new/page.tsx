import Header from '@/components/layout/Header'
import AssetForm from '../AssetForm'

export const dynamic = 'force-dynamic'

export default function NewAssetPage() {
  return (
    <div>
      <Header title="Add New Asset" subtitle="Register a new instrument or equipment" />
      <div className="p-6">
        <AssetForm />
      </div>
    </div>
  )
}
