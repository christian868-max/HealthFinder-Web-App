import { Facility } from '../types/facility';
import { mockFacilities } from '../data/mockData';

const KEY = 'healthfinder_facilities';

export function getFacilities(): Facility[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return mockFacilities;
    const parsed = JSON.parse(raw) as Facility[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : mockFacilities;
  } catch {
    return mockFacilities;
  }
}

export function saveFacilities(facilities: Facility[]) {
  localStorage.setItem(KEY, JSON.stringify(facilities));
}

