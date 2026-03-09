import Header from '@/components/layout/Header'
import OrderForm from '../OrderForm'

export default function NewOrderPage() {
  return (
    <div>
      <Header title="New Order" subtitle="Create a purchase order for consumable inventory" />
      <div className="p-6">
        <OrderForm />
      </div>
    </div>
  )
}
