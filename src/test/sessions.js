import { basicToken, setSession } from '../auth/session'
import { setCustomerSession } from '../auth/customerSession'
import { STAFF_PASSWORD, customerToken } from '../mocks/db'

const USERNAME = { WAREHOUSE: 'warehouse', FINANCE: 'finance', MANAGER: 'manager' }

/** Signs in a seeded staff user with HTTP Basic credentials the mock backend accepts. */
export function signInStaff(role) {
  const username = USERNAME[role]
  setSession({ token: basicToken(username, STAFF_PASSWORD), username, role })
}

/** Opens a customer session scoped to an order, as POST /customer/session would. */
export function signInCustomer(orderNumber) {
  setCustomerSession({
    accessToken: customerToken(orderNumber),
    expiresAt: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    orderNumber,
  })
}
