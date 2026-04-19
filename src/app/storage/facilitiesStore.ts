import { Facility } from '../types/facility';
import { mockFacilities } from '../data/mockData';

const KEY = 'healthfinder_facilities';

export function getLocalFacilities(): Facility[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return mockFacilities;
    const parsed = JSON.parse(raw) as Facility[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : mockFacilities;
  } catch {
    return mockFacilities;
  }
}

export function saveLocalFacilities(facilities: Facility[]) {
  localStorage.setItem(KEY, JSON.stringify(facilities));
}

export async function fetchFacilities(): Promise<Facility[]> {
  const localAppts = getLocalFacilities();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '';
  if (apiBaseUrl) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/facilities`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('API fetch failed, fallback to local facilities', err);
    }
  }
  return localAppts;
}

