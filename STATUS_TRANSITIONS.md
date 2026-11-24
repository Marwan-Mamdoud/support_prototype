# Status Transition Rules (Update Status)

> Defines allowed `newStatus` values for `POST /api/orders/:model/:id/status` (and demo equivalent). `allowedNextStatuses(currentStatus, type)` returns the list. Final statuses (Collected, RTW, RTO) have no outgoing transitions.

## Normal orders

| Current status | Can change to |
|---|---|
| Pending | Any status |
| Out of stock | Pending only |
| Picked (packed) | Any except Pending and Out of stock |
| Picked up (pickedUp) | Any except Pending, Picked (packed), and Out of stock |
| Processing | Any except Pending, Picked (packed), Picked up, and Out of stock |
| Out for delivery | Delivered, Cancelled, or Postponed only |
| Delivered | Collected only |
| Cancelled | Returned, QC, Dropped off, RTO, or RTW |
| QC | Dropped off, RTO, or RTW |
| Postponed | Processing or Out for delivery |
| Returned | Processing, QC, RTO, or RTW |
| Dropped off | RTW or RTO |
| Collected | (final — none) |
| RTW | (final — none) |
| RTO | (final — none) |

## Incoming rule
- Only **Pending** can become **Out of stock**.

## Refund orders
Refund orders follow special rules for these two statuses; all other statuses follow the normal rules.

### Processing (refund)
Can change to: Out for delivery, Delivered, QC, Postponed, Dropped off, RTW, or RTO.

### Out for delivery (refund)
Can change to: Delivered, QC, Postponed, Dropped off, RTW, or RTO.

### Refund statuses (Delivered, QC, Postponed, Dropped off under refund)
Follow the normal-order rules (no special override).

## Notes
- "Picked" maps to the `packed` status.
- Final statuses: Collected, RTW, RTO (end states, no further transitions).
- `canEditStatus(s)` returns true iff `allowedNextStatuses(s)` is non-empty.
