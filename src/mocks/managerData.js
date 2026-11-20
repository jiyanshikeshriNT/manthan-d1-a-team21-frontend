// Mock manager metrics: last 30 days across the 6 seeded categories (2,000 orders in total).
const DAY = 86_400_000
const ago = (d, h = 0) => new Date(Date.now() - d * DAY - h * 3_600_000).toISOString()

const cat = (category, returns, orders, returnable = true) => ({
  category,
  returnable,
  returns,
  orders,
  returnRate: orders ? Math.round((returns / orders) * 1000) / 1000 : 0,
})

export const METRICS = {
  periodDays: 30,
  avgCycleTimeHours: 100, // 4 d 4 h, request to refund
  returnRateByCategory: [
    cat('Fashion', 89, 471),
    cat('Electronics', 41, 331),
    cat('Home & Kitchen', 31, 430),
    cat('Beauty', 12, 236),
    cat('Innerwear', 0, 268, false),
    cat('Grocery', 0, 264, false),
  ],
  topReasons: [
    { reason: 'WRONG_SIZE', count: 61 },
    { reason: 'DAMAGED', count: 39 },
    { reason: 'NOT_AS_DESCRIBED', count: 33 },
    { reason: 'CHANGED_MIND', count: 28 },
    { reason: 'OTHER', count: 12 },
  ],
}

export const FLAGGED = [
  { customerId: 'cus_0412', customerName: 'Meera Joshi', returnCount30d: 5, lastReturnAt: ago(1, 3) },
  { customerId: 'cus_0177', customerName: 'Vikram Patel', returnCount30d: 4, lastReturnAt: ago(2, 6) },
  { customerId: 'cus_0291', customerName: 'Karan Desai', returnCount30d: 4, lastReturnAt: ago(6) },
  { customerId: 'cus_0388', customerName: 'Ananya Rao', returnCount30d: 6, lastReturnAt: ago(0, 5) },
  { customerId: 'cus_0045', customerName: 'Farhan Ali', returnCount30d: 4, lastReturnAt: ago(11) },
  { customerId: 'cus_0460', customerName: 'Divya Nair', returnCount30d: 5, lastReturnAt: ago(3, 2) },
  { customerId: 'cus_0103', customerName: 'Rohit Sinha', returnCount30d: 4, lastReturnAt: ago(9, 4) },
]
