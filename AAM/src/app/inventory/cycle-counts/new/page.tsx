import Header from '@/components/layout/Header'
import CycleCountForm from './CycleCountForm'

interface PageProps {
  searchParams: Promise<{ item_id?: string }>
}

export default async function NewCycleCountPage({ searchParams }: PageProps) {
  const { item_id } = await searchParams

  return (
    <div>
      <Header title="New Cycle Count" subtitle="Record a physical inventory count" />
      <div className="p-6">
        <CycleCountForm preselectedItemId={item_id} />
      </div>
    </div>
  )
}
