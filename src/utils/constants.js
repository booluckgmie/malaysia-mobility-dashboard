export const DATA_GOV_API = 'https://api.data.gov.my/data-catalogue'
export const WFH_START_DATE = new Date('2026-04-15')
// NOT the same basis as the live ridership_headline API — see mfIndex.js
// normaliseRidership() for why this isn't used as a normalisation ceiling.
export const BASELINE_ANNUAL_RIDERSHIP = 522.0  // million trips, Prasarana+KTMB annual reports (2019)

export const FUEL_SAVINGS_PARAMS = {
  tripsPerEmployeePerDay: 2,
  avgKmOneWay: 15,
  fuelLPer100km: 8,
  workdaysPerWeek: 5,
}
