// Visualize any bounding box at: http://bboxfinder.com/#latMin,lngMin,latMax,lngMax
export const CITY_BOUNDS = {
  seoul:     { latMin: 37.40, latMax: 37.72, lngMin: 126.75, lngMax: 127.25 }, // http://bboxfinder.com/#37.40,126.75,37.72,127.25
  hong_kong: { latMin: 22.15, latMax: 22.50, lngMin: 113.82, lngMax: 114.44 }, // http://bboxfinder.com/#22.15,113.82,22.50,114.44
};

export const config = {
  sourceList: 'Want to go',
  destList: 'Hong Kong WTG',

  bounds: CITY_BOUNDS.hong_kong,

  pageSize: 500,
};

// e.g. "Hong Kong WTG" → "hong-kong-wtg"
export const destSlug = config.destList.toLowerCase().replace(/\s+/g, '-');
