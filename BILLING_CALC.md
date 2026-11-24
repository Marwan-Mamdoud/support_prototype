# Order Billing Calculation — Full Case Matrix

> Roles: **Turuq** is the shipping company.
> - `subtotal` = amount **we pay the brand** (+ we pay brand; − brand pays us).
> - `total` = amount **we get from the customer** (+ customer pays us; − we pay customer).
> - `shippingFees` (fees) = **our gain** = `total − subtotal`.
> - `P` = amount basis:
>   - NORMAL / PROMOTIONAL → sum of product prices (price × quantity).
>   - REFUND → `refundAmount` (≥ 0).
>   - EXCHANGE → `exchangeAmount` (signed +/-). Uses NORMAL formulas with signed P.
> - `S` = shipping cost for the governorate (`defaultShippingFee`, 60–128). Forced to `0` when handler = `TURUQ`.

## Legend
- **Handler:** who bears the shipping cost.
  - `TURUQ` → we absorb → shippingFees = 0.
  - `BRAND` → brand bears it → deducted from brand payment.
  - `CUSTOMER` → customer bears it → added to customer total.
- **Type:** `NORMAL`, `PROMOTIONAL`, `REFUND`, `EXCHANGE`.
- **Payment:** `PAID` (customer already paid products) or `UNPAID`.

## Rule: PROMOTIONAL disables CUSTOMER handler
For `PROMOTIONAL` orders the `CUSTOMER` shipping option is impossible and is disabled in the UI (only `BRAND` or `TURUQ` allowed).

## Rule: PAID → total = 0 (all types)
When `PAID`, the customer already paid the products (to the brand directly), so Turuq only settles shipping:
- `total = 0`
- `subtotal = −shippingFees` (brand pays us the shipping fee; product price netted to zero)
- `gain = shippingFees` (TURUQ → 0)

## Rule: REFUND and EXCHANGE support PAID and UNPAID
Both types allow paid/unpaid status. PAID→total=0 applies to both.

## Rule: REFUND amount is positive only
`refundAmount ≥ 0`. `P = refundAmount`. Uses the reversed (refund) flow.

## Rule: EXCHANGE uses NORMAL formulas with signed amount
`exchangeAmount` is signed (+/-). The same NORMAL formulas apply with `P = exchangeAmount`:
- Positive P → customer pays us, we pay brand.
- Negative P → we pay customer, brand pays us (reversed direction emerges from the sign).
No separate REFUND flow is needed for EXCHANGE.

---

## 1. NORMAL (P = product sum)

### 1.1 UNPAID
| Handler | shippingFees | subtotal (we pay brand) | total (customer pays) | gain |
|---|---|---|---|---|
| TURUQ | 0 | P | P | 0 |
| CUSTOMER | S | P | P + S | S |
| BRAND | S | P − S | P | S |

### 1.2 PAID
| Handler | shippingFees | subtotal | total | gain |
|---|---|---|---|---|
| TURUQ | 0 | 0 | 0 | 0 |
| CUSTOMER | S | −S | 0 | S |
| BRAND | S | −S | 0 | S |

---

## 2. PROMOTIONAL (customer pays products only; CUSTOMER handler disabled)

### 2.1 UNPAID
| Handler | shippingFees | subtotal | total | gain |
|---|---|---|---|---|
| TURUQ | 0 | P | P | 0 |
| BRAND | S | P − S | P | S |
| CUSTOMER | disabled | — | — | — |

### 2.2 PAID
| Handler | shippingFees | subtotal | total | gain |
|---|---|---|---|---|
| TURUQ | 0 | 0 | 0 | 0 |
| BRAND | S | −S | 0 | S |
| CUSTOMER | disabled | — | — | — |

---

## 3. REFUND (P = refundAmount ≥ 0; reversed flow — brand reimburses product price)

### 3.1 UNPAID
| Handler | shippingFees | subtotal (we pay brand) | total (we get from customer) | gain |
|---|---|---|---|---|
| TURUQ | 0 | −P | −P | 0 |
| CUSTOMER | S | −P | S − P | S |
| BRAND | S | −P − S | −P | S |

### 3.2 PAID
| Handler | shippingFees | subtotal | total | gain |
|---|---|---|---|---|
| TURUQ | 0 | 0 | 0 | 0 |
| CUSTOMER | S | −S | 0 | S |
| BRAND | S | −S | 0 | S |

> Note: `total` is negative = we pay the customer. `subtotal` is negative = brand pays us.

---

## 4. EXCHANGE (P = exchangeAmount, signed; uses NORMAL formulas)

### UNPAID
| Handler | shippingFees | subtotal | total | gain |
|---|---|---|---|---|
| TURUQ | 0 | P | P | 0 |
| CUSTOMER | S | P | P + S | S |
| BRAND | S | P − S | P | S |

### PAID
| Handler | shippingFees | subtotal | total | gain |
|---|---|---|---|---|
| TURUQ | 0 | 0 | 0 | 0 |
| CUSTOMER | S | −S | 0 | S |
| BRAND | S | −S | 0 | S |

> Note: P is signed. Positive P → customer pays us. Negative P → we pay customer (reversed direction emerges from the sign).

---

## Summary table — all valid combinations (22 rows)

| Type | Amount | Handler | Payment | shippingFees | subtotal | total | gain |
|---|---|---|---|---|---|---|---|
| NORMAL | product sum | TURUQ | UNPAID | 0 | P | P | 0 |
| NORMAL | product sum | TURUQ | PAID | 0 | 0 | 0 | 0 |
| NORMAL | product sum | CUSTOMER | UNPAID | S | P | P+S | S |
| NORMAL | product sum | CUSTOMER | PAID | S | −S | 0 | S |
| NORMAL | product sum | BRAND | UNPAID | S | P−S | P | S |
| NORMAL | product sum | BRAND | PAID | S | −S | 0 | S |
| PROMOTIONAL | product sum | TURUQ | UNPAID | 0 | P | P | 0 |
| PROMOTIONAL | product sum | TURUQ | PAID | 0 | 0 | 0 | 0 |
| PROMOTIONAL | product sum | BRAND | UNPAID | S | P−S | P | S |
| PROMOTIONAL | product sum | BRAND | PAID | S | −S | 0 | S |
| REFUND | refundAmount ≥0 | TURUQ | UNPAID | 0 | −P | −P | 0 |
| REFUND | refundAmount ≥0 | TURUQ | PAID | 0 | 0 | 0 | 0 |
| REFUND | refundAmount ≥0 | CUSTOMER | UNPAID | S | −P | S−P | S |
| REFUND | refundAmount ≥0 | CUSTOMER | PAID | S | −S | 0 | S |
| REFUND | refundAmount ≥0 | BRAND | UNPAID | S | −P−S | −P | S |
| REFUND | refundAmount ≥0 | BRAND | PAID | S | −S | 0 | S |
| EXCHANGE | amount (signed) | TURUQ | UNPAID | 0 | P | P | 0 |
| EXCHANGE | amount (signed) | TURUQ | PAID | 0 | 0 | 0 | 0 |
| EXCHANGE | amount (signed) | CUSTOMER | UNPAID | S | P | P+S | S |
| EXCHANGE | amount (signed) | CUSTOMER | PAID | S | −S | 0 | S |
| EXCHANGE | amount (signed) | BRAND | UNPAID | S | P−S | P | S |
| EXCHANGE | amount (signed) | BRAND | PAID | S | −S | 0 | S |


## Invariants
- `gain = total − subtotal = shippingFees` (always).
- `shippingFees = 0` when handler = `TURUQ`.
- `shippingFees = S` (governorate default) when handler = `BRAND` or `CUSTOMER`.
- `PAID → total = 0` (all types).
- `REFUND → P = refundAmount (≥ 0)`.
- `EXCHANGE → P = exchangeAmount (signed); NORMAL formulas apply, sign drives direction`.
- `PROMOTIONAL → CUSTOMER handler disabled`.

## Recompute triggers (create & update)
Recompute `shippingFees`, `subtotal`, `total` when any of:
- products change (quantity, price, add/remove item) — for NORMAL/PROMOTIONAL
- refundAmount / exchangeAmount change
- governorate changes
- shipping handler changes
- payment status changes

Otherwise keep manual values.

## Auto-resolve / stock
- On product change in update: restore old stock, deduct new stock, flag `outOfStock` if quantity exceeds available.
- `PAID` orders force `total = 0` after computation.

## Formulas (implementation)
See `lib/rules/shipping.ts`:
- `computeSubtotal(type, products, shippingFees, handler, paymentStatus)`
- `computeTotal(type, products, shippingFees, handler, paymentStatus)`

For EXCHANGE, the caller passes `P = exchangeAmount` (signed); EXCHANGE uses NORMAL branch (sign drives direction).

And `create`/`update` routes in `app/api/orders/...`.
