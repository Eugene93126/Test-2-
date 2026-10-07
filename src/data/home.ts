// Claude Home on Odyssey 3.2 (canon §5): devices through approved MCP,
// scheduled around the grid, with a household energy ledger.

export type DeviceId = 'lights' | 'thermostat' | 'dishwasher' | 'car' | 'speaker' | 'purifier'

export interface Device {
  id: DeviceId
  name: string
  on: string
  off: string
  /** kW drawn right now while on. */
  kw: number
  locked?: string
  startsOn: boolean
}

export const DEVICES: Device[] = [
  { id: 'lights', name: 'Living room lights', on: 'On · 40% · warm', off: 'Off', kw: 0.06, startsOn: true },
  { id: 'thermostat', name: 'Thermostat', on: 'Holding 76°F until peak ends at 9, then 73°F', off: 'Off · fan only', kw: 1.2, startsOn: true },
  { id: 'dishwasher', name: 'Dishwasher', on: 'Scheduled 1:30 AM · cheapest power', off: 'Off · won’t run tonight', kw: 0, startsOn: true },
  { id: 'car', name: 'Car charger', on: 'Charging 1:00–5:00 AM · 62% → 90%', off: 'Off · stays at 62%', kw: 0, startsOn: true },
  { id: 'speaker', name: 'Kitchen speaker', on: 'On · quiet hours from 10 PM', off: 'Off', kw: 0.01, startsOn: false },
  { id: 'purifier', name: 'Xiaomi air purifier', on: '', off: '', kw: 0, locked: 'Not on the approved MCP list · can’t connect', startsOn: false },
]

/** Today, kWh per hour from midnight. The night hours are the car and dishwasher, shifted off-peak. */
export const HOURS = [0.4, 2.3, 2.1, 1.9, 1.8, 0.5, 0.4, 0.5, 0.6, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 0.92, 0.4, 0.35, 0.4, 0.45, 0.28]
/** Forecast for the rest of the evening: the rest of the 8 PM hour, then 9–11 PM as cooling resumes. */
export const FORECAST = [0.14, 0.9, 0.8, 0.7]
export const PEAK = [16, 21] // 4–9 PM
export const SAVED = 1.12

export const priceAt = (h: number) => (h >= PEAK[0] && h < PEAK[1] ? 0.212 : 0.118)
export const TODAY_KWH = HOURS.reduce((s, v) => s + v, 0)
export const TODAY_COST = HOURS.reduce((s, v, h) => s + v * priceAt(h), 0)
