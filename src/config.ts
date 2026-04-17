export const config = {
  // Source list to read from — must match your Google Maps list name exactly
  sourceList: 'Wanna Go',

  // Destination list to move matching pins to — must be created manually in Google Maps first
  destList: 'Seoul WTG',

  // Bounding box for Seoul (covers the greater metro area)
  seoulBounds: { latMin: 37.40, latMax: 37.72, lngMin: 126.75, lngMax: 127.25 },

  // getlist API — !4i{LIMIT}!5i{OFFSET} controls pagination
  // Obtained from the browser network tab while viewing your saved list.
  // The pb= token encodes your list ID and session — re-capture if this stops working.
  getlistUrl: 'https://www.google.com/maps/preview/entitylist/getlist?authuser=0&hl=en&gl=us&pb=!1m6!1s1bL1AwCTFBkIL0PET_AFv-URFu38!2e3!3m1!1e1!3m1!1e9!2e2!3e2!4i{LIMIT}!5i{OFFSET}!6m3!1sSZvhaaCMC5Ki5NoPv_bymAM!7e81!28e2!8i3!16b1',

  pageSize: 500,
  totalPlaces: 2974,
};
