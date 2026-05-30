export type CoverageZoneStatus = 'active' | 'paused' | 'unavailable';

export interface CoverageZone {
  id: string;
  slug: string;
  name: string;
  status: CoverageZoneStatus;
  cityOrRegion: string;
  postcodePrefixes: string[];
  basePostcode: string;
  radiusMiles: number;
  estimatedResponseMinutesMin: number;
  estimatedResponseMinutesMax: number;
  callOutFeePence: number;
  availableNow: boolean;
  availableToday: boolean;
  availableTomorrow: boolean;
  dailyCapacity: number;
  priority: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoverageZoneWriteInput {
  slug: string;
  name: string;
  status: CoverageZoneStatus;
  cityOrRegion: string;
  postcodePrefixes: string[];
  basePostcode: string;
  radiusMiles: number;
  estimatedResponseMinutesMin: number;
  estimatedResponseMinutesMax: number;
  callOutFeePence: number;
  availableNow: boolean;
  availableToday: boolean;
  availableTomorrow: boolean;
  dailyCapacity: number;
  priority: number;
  notes?: string | null;
}
