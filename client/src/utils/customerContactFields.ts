/**
 * CRM stores customer contactNumbers and email as JSON-encoded string arrays (or legacy plain strings).
 */

export function parseCustomerStringList(raw: string | null | undefined): string[] {
  if (raw == null || raw === '') return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v).trim()).filter(Boolean)
    }
    const single = String(parsed).trim()
    return single ? [single] : []
  } catch {
    const single = raw.trim()
    return single ? [single] : []
  }
}

/** For multi-input forms: at least one empty row when there is no saved data. */
export function parseCustomerStringListForForm(raw: string | null | undefined): string[] {
  const list = parseCustomerStringList(raw)
  return list.length > 0 ? list : ['']
}

export function formatCustomerStringList(values: string[]): string {
  return values.map((v) => v.trim()).filter(Boolean).join(', ')
}
