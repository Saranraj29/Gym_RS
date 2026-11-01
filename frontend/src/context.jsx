import { createContext, useContext } from 'react'

export const AppCtx = createContext({ settings: null, templates: null, reloadSettings: () => {} })
export const useApp = () => useContext(AppCtx)
