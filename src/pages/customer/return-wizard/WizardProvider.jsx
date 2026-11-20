import { useMemo, useReducer } from 'react'
import { WizardContext, createInitialState, wizardReducer } from './wizardState'

/** @param {{ initialState?: object, children: React.ReactNode }} props  initialState is for tests */
export default function WizardProvider({ initialState, children }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState, (s) => s ?? createInitialState())
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}
