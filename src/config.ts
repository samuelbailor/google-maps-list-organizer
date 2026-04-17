// Visualize any bounding box at: http://bboxfinder.com/#latMin,lngMin,latMax,lngMax
// To add a new city: find its lat/lng extents on the map, verify at bboxfinder, add an entry here.
export const BOUNDS = {
  seoul:     { latMin: 37.40, latMax: 37.72, lngMin: 126.75, lngMax: 127.25 }, // http://bboxfinder.com/#37.40,126.75,37.72,127.25
  busan:     { latMin: 35.02, latMax: 35.28, lngMin: 128.90, lngMax: 129.30 }, // http://bboxfinder.com/#35.02,128.90,35.28,129.30
  jeju:      { latMin: 33.20, latMax: 33.60, lngMin: 126.15, lngMax: 127.00 }, // http://bboxfinder.com/#33.20,126.15,33.60,127.00 (includes Udo)
  tokyo:     { latMin: 35.55, latMax: 35.82, lngMin: 139.60, lngMax: 139.92 }, // http://bboxfinder.com/#35.55,139.60,35.82,139.92
  taiwan:    { latMin: 21.90, latMax: 25.35, lngMin: 119.90, lngMax: 122.10 }, // http://bboxfinder.com/#21.90,119.90,25.35,122.10
  paris:     { latMin: 48.75, latMax: 49.00, lngMin:   2.20, lngMax:   2.55 }, // http://bboxfinder.com/#48.75,2.20,49.00,2.55
  london:    { latMin: 51.30, latMax: 51.70, lngMin:  -0.50, lngMax:   0.30 }, // http://bboxfinder.com/#51.30,-0.50,51.70,0.30
  nyc:       { latMin: 40.57, latMax: 40.92, lngMin: -74.02, lngMax: -73.70 }, // http://bboxfinder.com/#40.57,-74.02,40.92,-73.70
  hong_kong: { latMin: 22.15, latMax: 22.50, lngMin: 113.82, lngMax: 114.44 }, // http://bboxfinder.com/#22.15,113.82,22.50,114.44
};

export const config = {
  // Name of the list you're moving places FROM — must match exactly as it appears in Google Maps.
  sourceList: 'Want to go',

  // Name of the list you're moving places TO — must be created manually in Google Maps first.
  destList: 'Hong Kong WTG',

  // Bounding box for filtering places by location. Pick a preset from BOUNDS above,
  // or define your own: { latMin, latMax, lngMin, lngMax }.
  bounds: BOUNDS.hong_kong,

  // Number of places fetched per API page. 500 is the Maps maximum — no need to change this default value.
  pageSize: 500,
};

// Derived from destList for use as a filename slug — e.g. "Hong Kong WTG" → "hong-kong-wtg"
export const destSlug = config.destList.toLowerCase().replace(/\s+/g, '-');
