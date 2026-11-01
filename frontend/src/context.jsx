import { createContext, useContext } from 'react'

export const AppCtx = createContext({
  settings: null,
  templates: null,
  reloadSettings: () => {},
  locations: [],
  reloadLocations: () => {},
  locationId: 'all',
  setLocationId: () => {},
  locParam: undefined,
})
export const useApp = () => useContext(AppCtx)
