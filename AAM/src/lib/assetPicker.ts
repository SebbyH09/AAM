/**
 * Shared shape and column list for the asset search picker.
 *
 * These live here rather than in AssetPicker.tsx because that file is a
 * 'use client' module: a Server Component importing a value from it gets a
 * client reference back instead of the value, so `select(ASSET_PICKER_COLUMNS)`
 * would blow up at request time. Keeping the constant in a neutral module lets
 * the server pages that load assets and the client picker share one definition.
 */

/**
 * Minimal shape the picker needs. Every field beyond id/name is optional so a
 * caller can pass whatever columns it selected, but the more it passes the more
 * the user can search on (model #, serial #, manufacturer, location...).
 */
export interface PickerAsset {
  id: string
  name: string
  asset_tag?: string | null
  category?: string | null
  manufacturer?: string | null
  model?: string | null
  serial_number?: string | null
  location?: string | null
  status?: string | null
}

/** Columns to select when loading assets for a picker. */
export const ASSET_PICKER_COLUMNS =
  'id, name, asset_tag, category, manufacturer, model, serial_number, location, status'
