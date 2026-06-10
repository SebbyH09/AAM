import Header from '@/components/layout/Header'
import VendorForm from '../VendorForm'

export const dynamic = 'force-dynamic'

export default async function NewVendorPage() {
  return (
    <div>
      <Header title="Add Vendor" subtitle="Add a new vendor or supplier to your directory" />
      <div className="p-6">
        <VendorForm />
      </div>
    </div>
  )
}
