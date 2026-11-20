import { useSyncExternalStore } from 'react'
import { getSession, subscribe } from './session'

/** Current staff session (or null), re-rendering on sign-in / sign-out. */
export function useSession() {
  return useSyncExternalStore(subscribe, getSession, getSession)
}
