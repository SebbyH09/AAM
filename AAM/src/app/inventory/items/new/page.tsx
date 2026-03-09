import Header from '@/components/layout/Header'
import InventoryItemForm from '../InventoryItemForm'

export default function NewInventoryItemPage() {
  return (
    <div>
      <Header title="Add Inventory Item" subtitle="Add a new consumable item to inventory" />
      <div className="p-6">
        <InventoryItemForm />
      </div>
    </div>
  )
}
