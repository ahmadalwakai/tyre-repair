export interface LiveVisitor {
  visitorId: string;
  currentPage: string | null;
  approxCity: string | null;
  approxRegion: string | null;
  approxCountry: string | null;
  latitude: number | null;
  longitude: number | null;
  consentGiven: boolean;
  lastSeenAt: string;
}

export interface LiveVisitorsResponse {
  visitors: LiveVisitor[];
  count: number;
}
