// Mock data that follows docs/api-contract.md. Dates are relative to today so the
// return windows always show realistic "days left".
const DAY = 86_400_000
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString()

export const STAFF_USERS = [
  { email: 'warehouse@returnright.test', password: 'password', role: 'WAREHOUSE' },
  { email: 'finance@returnright.test', password: 'password', role: 'FINANCE' },
  { email: 'manager@returnright.test', password: 'password', role: 'MANAGER' },
]

export const ORDERS = [
  {
    orderId: 'ord_7f3a91',
    orderNumber: 'RR-100245',
    email: 'priya.sharma@example.com',
    placedAt: daysAgo(9),
    deliveredAt: daysAgo(6),
    items: [
      { orderItemId: 'oi_1', productName: 'Cotton kurta, indigo, size M', sku: 'FSH-KUR-IND-M', category: 'Fashion', unitPricePaise: 129900, quantity: 1, returnableQuantity: 1, eligible: true, reasonCode: 'ELIGIBLE', message: '', daysLeft: 24 },
      { orderItemId: 'oi_2', productName: 'Wireless earbuds, black', sku: 'ELC-EAR-BLK', category: 'Electronics', unitPricePaise: 179900, quantity: 1, returnableQuantity: 1, eligible: true, reasonCode: 'ELIGIBLE', message: '', daysLeft: 4 },
      { orderItemId: 'oi_3', productName: 'Steel water bottle, 1 L', sku: 'HOM-BTL-1L', category: 'Home & Kitchen', unitPricePaise: 64900, quantity: 2, returnableQuantity: 2, eligible: true, reasonCode: 'ELIGIBLE', message: '', daysLeft: 24 },
      { orderItemId: 'oi_4', productName: 'Cotton briefs, pack of 3', sku: 'INW-BRF-3P', category: 'Innerwear', unitPricePaise: 49900, quantity: 1, returnableQuantity: 0, eligible: false, reasonCode: 'NON_RETURNABLE_CATEGORY', message: 'Innerwear can’t be returned for hygiene reasons.', daysLeft: null },
      { orderItemId: 'oi_5', productName: 'Smartwatch strap, 22 mm', sku: 'ELC-STR-22', category: 'Electronics', unitPricePaise: 89900, quantity: 1, returnableQuantity: 0, eligible: false, reasonCode: 'NOT_DELIVERED', message: 'This item was shipped separately and hasn’t been delivered yet. You can return it once it arrives.', daysLeft: null },
    ],
  },
  {
    orderId: 'ord_2c88d0',
    orderNumber: 'RR-100310',
    email: 'arjun.mehta@example.com',
    placedAt: daysAgo(44),
    deliveredAt: daysAgo(40),
    items: [
      { orderItemId: 'oi_6', productName: 'Running shoes, size 9', sku: 'FSH-RUN-09', category: 'Fashion', unitPricePaise: 349900, quantity: 1, returnableQuantity: 0, eligible: false, reasonCode: 'WINDOW_CLOSED', message: 'Most items can be returned within 30 days. This was delivered 40 days ago.', daysLeft: null },
      { orderItemId: 'oi_7', productName: 'Organic honey, 500 g', sku: 'GRC-HNY-500', category: 'Grocery', unitPricePaise: 42500, quantity: 1, returnableQuantity: 0, eligible: false, reasonCode: 'NON_RETURNABLE_CATEGORY', message: 'Perishable items can’t be returned.', daysLeft: null },
    ],
  },
]
