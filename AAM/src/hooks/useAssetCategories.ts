'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_ASSET_CATEGORIES } from '@/lib/assetCategories'

/** Asset category names from Settings, falling back to the built-in list. */
export function useAssetCategories(): string[] {
  const [categories, setCategories] = useState<string[]>(DEFAULT_ASSET_CATEGORIES)

  useEffect(() => {
    let cancelled = false
    createClient()
      .from('asset_categories')
      .select('name')
      .order('sort_order')
      .order('name')
      .then(({ data, error }) => {
        if (cancelled || error || !data || data.length === 0) return
        setCategories(data.map((c: { name: string }) => c.name))
      })
    return () => { cancelled = true }
  }, [])

  return categories
}
