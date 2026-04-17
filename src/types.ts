export interface SavedPlace {
  name: string;
  address: string;
  url: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}
