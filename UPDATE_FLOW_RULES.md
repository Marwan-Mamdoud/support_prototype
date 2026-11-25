# Order Update Flow — Field Validation & Triggers

> Per-field rules for `PATCH /api/orders/:model/:id` (and related endpoints). Each updated field has its own allowed statuses, and specific changes trigger issue flags.

## 1. Total & Payment Status & Shipping Handlers

**Blocked from update** (not editable in any status).

## 2. Products

**Blocked from update** (not editable in any status).

**Triggers:** none (products no longer editable).

## 3. Phone

**Validation statuses:**
- Pending, Picked up, Picked, Processing, Out of stock, Out for delivery, Postponed

**Triggers:**
- Picked, Picked up, Processing or Postponed: create an issue flag to reprint the bill of lading.
- Out for delivery: create an issue flag to reprint the bill of lading, and an issue flag to update the courier with the new phone number.

## 4. Address & Governorate

**Validation statuses:**
- Packed
- Picked up
- Processing
- Out for delivery
- Postponed

**Triggers:**
- Picked, Picked up, Processing or Postponed: create an issue flag to reprint the bill of lading.
- Out for delivery: create an issue flag to reprint the bill of lading, and an issue flag to update the courier with the new address.

## Always blocked from update
- Brand (`clientId`), Source, Type, Can open package (`canOpenPackage`).
- Financial data (`subtotal`, `total`, `shippingFees`, `shippingHandledBy`, `paymentMethod`, `paymentStatus`, `refundAmount`, `exchangeAmount`).
- Products (`products`, `refundAmount`, `exchangeAmount`).

## Other fields (notes, specialHandling, customerName, etc.)
- `customerName` / `customerFirstName` / `customerLastName`: always allowed (when order is editable).
- `notes`, `specialHandling`: editable only in Pending, Processing, Postponed, Out of stock.

## Auto-resolve
- `invalid_address` / `invalid_phone_number`: resolved when the field becomes valid.
- `address_update_required`: resolved when address is updated.
- `courier_finance_alert`: resolved when location leaves `with_courier`.
- `reprint_bill_of_lading` / `courier_*_alert`: resolved on status change.

## New issue flag types
- `courier_products_alert` — update courier with new products
- `courier_phone_alert` — update courier with new phone number
- `courier_address_alert` — update courier with new address
- `reprint_bill_of_lading` — reprint bill of lading (existing)
