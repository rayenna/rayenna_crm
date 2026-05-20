import { getWipKeysForCurrentUser } from '../lib/customerStore';
import type { SavedSheet } from '../lib/costingConstants';
import { setLocalStorageItem } from '../lib/safeLocalStorage';

export function loadSheets(): SavedSheet[] {
  try {
    const key = getWipKeysForCurrentUser().sheets;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function persistSheets(sheets: SavedSheet[]) {
  setLocalStorageItem(getWipKeysForCurrentUser().sheets, JSON.stringify(sheets));
}
