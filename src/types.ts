export interface SavedPlace {
  name: string;
  address: string;
  url: string;
  note: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}
