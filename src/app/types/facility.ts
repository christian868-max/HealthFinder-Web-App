export type FacilityType = 'Hospital' | 'Clinic' | 'Urgent Care' | 'Specialized Center';
export type CrowdLevel = 'Low' | 'Moderate' | 'High';

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  distance: number; // in km
  rating: number;
  crowdLevel: CrowdLevel;
  waitTime: number; // in minutes
  availableToday: boolean;
  nextAvailable: string; // time or date
  capabilities: string[];
  specialties: string[];
  phoneNumber: string;
  operatingHours: string;
  emergencyServices: boolean;
}
