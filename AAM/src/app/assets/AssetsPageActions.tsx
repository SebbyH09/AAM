'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Upload } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import AssetImport from './AssetImport'

export default function AssetsPageActions() {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setImportOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Upload className="h-4 w-4" />
        Import Assets
      </button>
      <Link
        href="/assets/new"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Asset
      </Link>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Assets from Excel"
        size="xl"
      >
        <AssetImport onSuccess={() => setImportOpen(false)} />
      </Modal>
    </>
  )
}
