# Order Update Flow — Field Validation & Triggers

> Per-field rules for `PATCH /api/orders/:model/:id` (and related endpoints). Each updated field has its own allowed statuses, and specific changes trigger issue flags.

## 1. Total & Payment Status & Shipping Handlers

**Validation statuses (allowed to edit these fields):**
- Pending, Processing, Picked (packed), Picked up (pickedUp), Out of stock, Out for delivery, Postponed

**Fields:** `subtotal`, `total`, `shippingFees`, `shippingHandledBy`, `paymentMethod`, `paymentStatus`

**Trigger:** none new (no flag; email-to-brand skipped per decision).

## 2. Products

**Validation statuses:**
- Normal type (any type except Refund, including Integration orders which have no type → treated as NORMAL): Pending, Out of stock
- Refund type: Processing, Out for delivery, Postponed

**Triggers:**
- Status Processing or Postponed, and type Refund → create issue flag `reprint_bill_of_lading` (reprint bill of lading).
- Status Out for delivery, and type Refund → create issue flag `reprint_bill_of_lading` (reprint bill of lading) AND `courier_products_alert` (update courier with new products).

## 3. Phone

**Validation statuses:**
- Pending, Picked up (pickedUp), Picked (packed), Processing, Out of stock, Out for delivery, Postponed

**Triggers:**
- Picked, Picked up, Processing or Postponed → create issue flag `reprint_bill_of_lading` (reprint bill of lading).
- Out for delivery → create issue flag `reprint_bill_of_lading` (reprint bill of lading) AND `courier_phone_alert` (update courier with the new phone number).

## 4. Address & Governorate

**Validation statuses:**
- Pending, Picked (packed), Picked up (pickedUp), Processing, Out for delivery, Postponed, Out of stock

**Triggers:**
- Picked, Picked up, Processing or Postponed → create issue flag `reprint_bill_of_lading` (reprint bill of lading).
- Out for delivery → create issue flag `reprint_bill_of_lading` (reprint bill of lading) AND `courier_address_alert` (update courier with the new address).

## Always blocked from update
- Brand (`clientId`), Source, Type, Can open package (`canOpenPackage`).

## Other fields (notes, specialHandling, customerName, etc.)
- Editable only in: Pending, Processing, Postponed, Out of stock (existing `canEditData`).

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
