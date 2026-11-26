# Status Transition Rules (Update Status)

> Only two transition rules apply. No other transitions are allowed.

## Rules

1. **Super account → Pending**: a super user can move any non-final order back to `pending`.
2. **All accounts → Cancelled**: any non-final order can be cancelled by any account.

## Final statuses (no outgoing transitions)
- Collected
- RTW
- RTO

All other statuses are non-final and follow the two rules above (plus the existing per-field update validation in `UPDATE_FLOW_RULES.md`).

## Notes
- `canEditStatus(s)` returns true for any non-final status (at least `cancelled` is available).
- `allowedNextStatuses(currentStatus, type, isSuper)` returns the list above.
- "Out for delivery" is no longer a settable target via Update Status.
