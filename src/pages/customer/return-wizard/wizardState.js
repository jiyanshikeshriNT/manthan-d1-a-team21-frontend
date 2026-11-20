import { createContext, useContext } from 'react'

export const STEPS = [
  { title: 'Find your order', description: 'Enter the order number and email from your order confirmation.' },
  { title: 'Select items', description: 'Choose what you’d like to return. Items that can’t be returned explain why.' },
  { title: 'Return details', description: 'Tell us why, add a photo if you can, and choose how to be refunded.' },
  { title: 'Review and submit', description: 'Check everything before you send the request.' },
]

const newKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `rr-${Date.now()}-${Math.random().toString(16).slice(2)}`

/**
 * Single source of truth for the wizard. Data is kept when moving back and forth.
 * selections: { [orderItemId]: { quantity, reason, reasonNote, photo: File|null } }
 * items: eligible items snapshot (from the eligibility call) used by later steps.
 */
export function createInitialState(overrides = {}) {
  return {
    step: 0,
    lookup: { orderNumber: '', email: '' },
    order: null,
    items: {},
    selections: {},
    refundMethod: '',
    // One key per wizard session: a retried submit can never create a second return.
    idempotencyKey: newKey(),
    ...overrides,
  }
}

export function wizardReducer(state, action) {
  switch (action.type) {
    case 'SET_LOOKUP':
      return { ...state, lookup: { ...state.lookup, [action.field]: action.value } }

    case 'ORDER_FOUND': {
      const same = state.order?.orderId === action.order.orderId
      return {
        ...state,
        order: action.order,
        // A different order invalidates everything chosen so far.
        items: same ? state.items : {},
        selections: same ? state.selections : {},
        refundMethod: same ? state.refundMethod : '',
        idempotencyKey: same ? state.idempotencyKey : newKey(),
        step: 1,
      }
    }

    case 'TOGGLE_ITEM': {
      const { item } = action
      const selections = { ...state.selections }
      const items = { ...state.items }
      if (selections[item.orderItemId]) {
        delete selections[item.orderItemId]
      } else {
        selections[item.orderItemId] = { quantity: 1, reason: '', reasonNote: '', photo: null }
        items[item.orderItemId] = item
      }
      return { ...state, selections, items }
    }

    case 'UPDATE_ITEM': {
      const current = state.selections[action.orderItemId]
      if (!current) return state
      return {
        ...state,
        selections: { ...state.selections, [action.orderItemId]: { ...current, ...action.patch } },
      }
    }

    case 'SET_REFUND_METHOD':
      return { ...state, refundMethod: action.value }

    case 'GO_TO':
      return { ...state, step: Math.max(0, Math.min(STEPS.length - 1, action.step)) }

    default:
      return state
  }
}

/** Selected items joined with their eligibility data. */
export function selectedLines(state) {
  return Object.entries(state.selections)
    .filter(([id]) => state.items[id])
    .map(([id, sel]) => ({ ...state.items[id], ...sel, orderItemId: id }))
}

/** Upper bound of the refund before inspection (Grade C may halve an item). */
export function estimatedRefundPaise(state) {
  return selectedLines(state).reduce((sum, l) => sum + l.unitPricePaise * l.quantity, 0)
}

export const WizardContext = createContext(null)

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside <WizardProvider>')
  return ctx
}
