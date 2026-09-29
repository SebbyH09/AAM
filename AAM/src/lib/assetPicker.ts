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
  group_id?: string | null
}

/** An asset group offered by the picker as a single "apply to every unit" target. */
export interface PickerGroup {
  id: string
  name: string
}

/** Columns to select when loading assets for a picker. */
export const ASSET_PICKER_COLUMNS =
  'id, name, asset_tag, category, manufacturer, model, serial_number, location, status, group_id'

/** Columns to select when loading groups for a picker. */
export const ASSET_GROUP_PICKER_COLUMNS = 'id, name'

/**
 * A picker value that stands for a whole group rather than one asset. Forms
 * keep it in the same `asset_id` field and expand it with `resolveAssetIds`
 * when saving, so one entry creates a record on every unit in the group.
 */
const GROUP_PREFIX = 'group:'

export function groupValue(groupId: string): string {
  return `${GROUP_PREFIX}${groupId}`
}

/** The group id if `value` is a group selection, otherwise null. */
export function parseGroupValue(value: string | null | undefined): string | null {
  return value && value.startsWith(GROUP_PREFIX) ? value.slice(GROUP_PREFIX.length) : null
}

export function groupMembers<T extends PickerAsset>(assets: T[], groupId: string): T[] {
  return assets.filter((a) => a.group_id === groupId)
}

/**
 * The asset ids a picker value covers: every member for a group, the one id
 * for an asset, or none when blank.
 */
export function resolveAssetIds(value: string | null | undefined, assets: PickerAsset[]): string[] {
  if (!value) return []
  const groupId = parseGroupValue(value)
  return groupId ? groupMembers(assets, groupId).map((a) => a.id) : [value]
}

/**
 * Splits a cost across `count` records so the group's total stays what was
 * entered. Rounds to cents and puts any leftover cent on the first record.
 */
export function splitCost(total: number | null, count: number): (number | null)[] {
  if (total === null || count <= 1) return Array.from({ length: Math.max(count, 1) }, () => total)
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / count)
  return Array.from({ length: count }, (_, i) => (base + (i === 0 ? cents - base * count : 0)) / 100)
}

/**
 * The asset_id each new record should get: one per group member, the single
 * asset, or `[null]` for a blank (asset-optional) field. An empty array means
 * a group with no assets was picked.
 */
export function recordTargets(value: string | null | undefined, assets: PickerAsset[]): (string | null)[] {
  return value ? resolveAssetIds(value, assets) : [null]
}
