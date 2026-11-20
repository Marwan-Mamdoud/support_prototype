# Support Role Prototype: Full Build Specification

Build a working **prototype** (real database, real server, full create / read / update / delete) of the dashboard a **Support staff member** uses at a logistics and shipping company. Read the whole document before writing code. Section 12 gives a recommended build order.

---

## 1. Goal and context

- The company (Turuq) is a logistics and shipping company that serves **brands** (online merchants). It ships orders with its **own couriers** in some areas, and with two outsourced carriers, **Bosta** and **ShipBlu**, in the others. **Brands must never see that Bosta or ShipBlu are used.** Only Support and Admin see carrier information.
- Support staff currently have no accounts of their own and work with admin accounts. This prototype shows what a dedicated **Support account** looks like and what it can do.
- It is a prototype: no real carrier APIs, no real emails, no real barcode hardware. Simulate those. Use seeded demo data.
- **All business rules must be enforced on the server**, not only in the UI. The UI hides or disables things, but the server rejects invalid requests with clear error messages.
- UI language: **English**, left-to-right. Customer names and addresses in the data can be Arabic or English.

## 2. Tech stack

- Frontend and server: **Next.js** (App Router) + TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Recharts for charts. Business rules live in Next.js **route handlers** (`app/api/...`) or server actions, never only in client components.
- Database: **MongoDB** (Atlas) with Mongoose (or the native driver). The connection string is read from the environment variable `MONGODB_URI`, and the database name from `MONGODB_DB` (default `support_prototype`, a dedicated prototype database). **Never hardcode the connection string** in code, in this spec, or in any repository. Keep it in `.env.local` (listed in `.gitignore`) and in the hosting provider's secret settings.
- Setup: `npm run seed` is re-runnable: it clears and recreates only the prototype collections with the demo data of section 8. `npm run dev` starts the app.
- Images (cancellation evidence): placeholder image URLs or files in `public/uploads` are enough for the prototype.
- Auth: a simple login screen (username + password, bcrypt-hashed in the database) with a signed session cookie. Seed four staff members (section 3).
- Timestamps are stored in UTC and shown as relative time ("3h ago") with the full date on hover.
- Every write goes through server code that also writes an **audit log** row (section 4, `order_audit_log`).

## 3. Roles and the seeded account

Table `staff_members`: `id`, `name`, `username` (unique), `phone`, `role` (enum `SUPPORT`, `ADMIN`), `active`, `password_hash` (prototype only).

Seed exactly four staff members, all with the `SUPPORT` role and the same prototype password:

| name | username | phone | role | password |
|---|---|---|---|---|
| Mona Adel | mona.support | 01012345678 | SUPPORT | support123 |
| Omar Fathy | omar.support | 01123456789 | SUPPORT | support123 |
| Salma Ibrahim | salma.support | 01234567890 | SUPPORT | support123 |
| Hassan Mostafa | hassan.support | 01512345678 | SUPPORT | support123 |

Add a **My Account** page that shows the profile (name, username, phone, role) and a clear **"What this account can do"** list:

**Can:** search and view orders from both sources; use quick order lookup; see carrier, courier and tracking details; open carrier tracking links; view the stale-orders page and take action; add and resolve issue flags; set special handling; create orders and create replacement/exchange orders; edit orders within the edit rules (section 5.6); cancel orders with a reason and evidence; review cancellation evidence; look up customers by phone; view client performance graphs; view dropoff batches; keep private notes.

**Cannot:** delete orders; edit orders outside the edit rules; change an order's status freely; manage staff; see the brand-side OTP screen except through the prototype simulator; see products management (there is no products page for Support).

## 4. Data model

The database is **MongoDB**. Each "table" below is a **collection**. Types written in SQL style (`uuid`, `jsonb`, `timestamptz`) mean `ObjectId`, embedded objects/arrays, and `Date`. Field names are written in snake_case for readability: **store them as camelCase** (`status_history` becomes `statusHistory`, `last_status_changed_at` becomes `lastStatusChangedAt`, `customer_phone_normalized` becomes `customerPhoneNormalized`), matching the real system. Names are suggestions; keep the meaning.

### 4.1 Orders: two tables, as in the real system

The real system has **two separate order collections**, and the dashboard must keep them separate with **two tabs everywhere orders are listed**: **Turuq Orders** (`turuq_orders`) and **Integration Orders** (`integration_orders`, orders imported from brand stores).

**Common columns (both tables):**

- `id` uuid, `oid` text unique (e.g. `TQ-100234` for Turuq, `SH-5531` for Integration), `client_id` fk to `clients`
- `status` text, one of: `pending, processing, packed, QC, pickedUp, droppedOff, outForDelivery, postponed, unreachable, invalidAddress, outOfStock, delivered, collected, returned, RTW, cancelled`
- `status_history` jsonb: one key per status the order has ever entered, value = ISO date of the last time it entered that status (example: `{"pending":"2026-11-01T09:00Z","processing":"2026-11-02T10:00Z"}`)
- `last_status_changed_at` timestamptz (indexed with `status`), updated on every status change
- `customer_phone`, `customer_phone_normalized` (see 5.2), `customer_address` (plain text), `customer_governorate` (text)
- `products` jsonb array: `[{uid, name, variant, quantity, price}]`
- `subtotal`, `total`, `shipping_fees` (numbers)
- `shipping_handled_by` enum `BRAND | CUSTOMER | TURUQ` (default `CUSTOMER`)
- `payment_method` (`CASH | INSTAPAY | VISA | FLASH`), `payment_status` (`PAID | UNPAID`)
- `can_open_package` boolean, `notes` text
- `courier_id` fk nullable, `courier_notes` text, `delivery_attempts` int, `delivery_attempt_timestamps` jsonb
- `tracking_number` text nullable (stored on the order itself)
- `current_location` enum nullable: `warehouse | brand_storage | distribution_center | with_courier | with_carrier | returns_team` (see 5.17)
- `special_handling` enum `none | urgent | vip | replacement` (default `none`)
- `has_open_issue` boolean default false (indexed)
- Cancellation: `cancellation_reason` (code from `cancellation_reasons`), `cancelled_by` enum `SUPPORT | BRAND | COURIER | SYSTEM`, `cancellation_images` jsonb (list of image URLs), `cancellation_review_status` enum `NONE | PENDING | APPROVED | REJECTED`, `cancellation_reviewed_by`, `cancellation_reviewed_at`, `cancellation_review_note`
- `dropoff_batch_id` nullable, `trip_batch_id` nullable
- `created_by_staff_id` nullable, `created_at`, `updated_at`

**Only in `turuq_orders`:** `customer_name`, `type` enum `NORMAL | PROMOTIONAL | REFUND | EXCHANGE`, `courier_assigned_at`.

**Only in `integration_orders`:** `customer_first_name`, `customer_last_name`, `provider` enum `SHOPIFY | WOOCOMMERCE | OPENAPI`, `external_id`. Integration orders have **no `type`**.

There is **no `courierCOD` column** anywhere.

### 4.2 Other tables

- `clients` (brands): `id`, `name`, `company_name` (unique), `phone`, `email`, `service_scheme` (`WAREHOUSE | PICKUP`), `active`.
- `couriers`: `id`, `name`, `phone`, `username`, `outsourced` boolean, `zone`, `active`. Two special rows: **Bosta** and **ShipBlu**, both `outsourced = true`.
- `products`: `id`, `uid` (unique), `item_description`, `primary_client_id`, `quantity`, `unit_price`, `size`, `color`. Used only to pick products when creating an order. There is no products management page.
- `issue_flags`: stored as an **embedded array `issueFlags` on every order document** (both collections), each element with its own `_id`: `type` (see 5.8), `note`, `reported_by_role` (`system | brand | support | warehouse | distribution_center`), `reported_by_user` text, `reported_at`, `state` (`open | resolved`), `resolved_by`, `resolved_at`, `resolve_note`. Alerts reference the flag by that `_id`.
- `alerts`: `id`, `type` (`NEW_FLAG | STATUS_UPDATED`), `order_model`, `order_id`, `flag_id`, `created_at`, `handled` boolean, `handled_by`, `handled_at`.
- `order_audit_log`: `id`, `order_model`, `order_id`, `action`, `field`, `old_value`, `new_value`, `user_id`, `user_role`, `at`.
- `verified_addresses`: `id`, `phone_normalized`, `address`, `governorate`, `verified_by`, `verified_at`, `source_order_model`, `source_order_id`.
- `support_notes`: `id`, `staff_id`, `text`, `done` boolean, `created_at`, `done_at`. Private to the staff member. No link to orders.
- `trip_batches` (order trips): `id`, `bid`, `courier_id`, `start_date`, `end_date`, `orders_count`. Minimal, mostly shown on order details.
- `dropoff_batches` (returned orders going back to brands, or warehouse orders): `id`, `bid`, `courier_id`, `destination_type` (`BRAND | WAREHOUSE`), `client_id` nullable, `start_date`, `end_date`, `status` (`OPEN | CLOSED`), `otp` (6 digits), `handed_over_by`, `finished_by`, `orders_count`.
- `cancellation_reasons` (config): `code`, `label`, `group` (`COURIER_SIDE | OTHER`), `requires_attachment`, `courier_payable_if_shipped`, `legacy` boolean.
- `brand_email_outbox`: `id`, `client_id`, `to_email`, `subject`, `body`, `created_at`. This simulates emails sent to brands.

## 5. Business rules (enforce on the server)

### 5.1 Carrier detection and tracking links

- The carrier is decided from the order's **courier**: if the courier is the row named **Bosta**, the carrier is Bosta; if **ShipBlu**, the carrier is ShipBlu; otherwise the order is shipped by a Turuq courier (no external carrier).
- Link rules (open in a new tab):
  - Bosta: `https://business.bosta.co/orders/{tracking_number}`
  - ShipBlu: `https://app.shipblu.com/order/{tracking_number}`
- The "Open on carrier" button only shows when the order has a tracking number and the courier is Bosta or ShipBlu. For Turuq couriers show "Shipped by Turuq courier" instead. If a carrier order has no tracking number, show "Tracking number not available yet".

### 5.2 Phone normalization and validation

- Normalize by removing non-digits, then converting a leading `20` or `0020` to `0`. Store the result in `customer_phone_normalized`. Use it for customer lookup and verified addresses.
- A phone is valid if it matches an Egyptian mobile pattern: `^01[0125][0-9]{8}$` after normalization.

### 5.3 Address validity

An address is **invalid** if, after trimming: it is shorter than 15 characters, OR has fewer than 3 words, OR has no digit and no street word (street, st, road, rd, building, tower, near, شارع, ش, طريق, عمارة, برج, بجوار, امام). Examples that must be invalid: `شارع معز الدولة`, `Moez Street`, `New Cairo`. This is a simple rule; keep it in one function so it can be replaced.

### 5.4 Shipping handler

- `shipping_handled_by` has three values: `CUSTOMER`, `BRAND`, `TURUQ`.
- `TURUQ` means the company pays the shipping: `shipping_fees` is forced to 0 for both customer and brand.
- `CUSTOMER`: shipping fee is added to `total`. `BRAND`: fee is charged to the brand and not added to `total`.
- `total = subtotal + (handler == CUSTOMER ? shipping_fees : 0)`.
- Default shipping fee by governorate (prototype): Cairo/Giza 60, Alexandria 70, other 90.

### 5.5 Final statuses

Final statuses are `delivered, collected, cancelled, returned, RTW`. Do not add `RTO`.

### 5.6 Edit rules (checked on the server)

| Order status | What Support can edit |
|---|---|
| `pending` | all customer, product, payment and notes fields (not `client`, `oid`, `status`) |
| `processing` | **only** `customer_address`, `subtotal`, `total` |
| `outOfStock` | **only** `customer_address`, and **only if** the keys of `status_history` are a subset of `{pending, outOfStock}` (the order never passed any other status; going back and forth is fine) |
| any other status | read-only |

Extra rules:
- Support must not be able to move an order from `processing` back to `pending`.
- Every edit writes audit rows (field, old, new, user, time).
- If `customer_address`, `subtotal` or `total` change, insert a row in `brand_email_outbox` for the order's brand with: order number, changed fields, old values, new values, the staff member, and the time.
- Editing is blocked with a clear message when the rule fails (for example "This order has passed other statuses, so the address is locked").

### 5.7 Status changes

Support cannot freely change statuses. For the demo, include a **Prototype simulator** panel (section 6.14) that lets you change an order's status as if a courier or carrier updated it. On every status change: set `status_history[status] = now`, set `last_status_changed_at = now`, write an audit row. If the order has an **open issue flag**, create a `STATUS_UPDATED` alert (unless an unhandled one already exists for that flag). The flag itself stays open.

### 5.8 Issue flags

- Types: `ticket`, `return_missing_items`, `return_wrong_items`, `invalid_address`, `invalid_phone_number`, `delayed_shipment`, `defective_items`, `other`.
- An order can have several flags over time. `has_open_issue` is true when at least one flag is `open`.
- Flags are **resolved manually only** (Resolve button + optional resolve note). Never remove or resolve them automatically.
- Anyone can report: `system`, `brand`, `support`, `warehouse`, `distribution_center`. Support creates flags from the UI as `support`. The other reporter roles are created by the simulator.
- Creating a flag creates a `NEW_FLAG` alert.
- **Automatic flags by the system:** when an order is created or imported, if the address is invalid (5.3) create an `invalid_address` flag; if the phone is invalid (5.2) create an `invalid_phone_number` flag. Reporter = `system`. The order is not blocked and its data is not changed.

### 5.9 Special handling

One value per order: `none | urgent | vip | replacement`. Brands cannot change it. Orders created by "Create new order" (5.12) get `replacement` automatically. Lists sort `urgent` first, then by newest.

### 5.10 Stale orders

An order is **stale** if its status is not final and `last_status_changed_at` is older than the chosen number of hours (default 48; options 24, 48, 72, custom). "No action taken" means the order has **no open issue flag**.

### 5.11 Cancelled before delivery

Saved filter "Cancelled before delivery": `status = cancelled`, the status history contains `processing` or `pickedUp`, and it contains none of `outForDelivery, delivered, postponed, unreachable, returned, RTW, collected, droppedOff`. Show `current_location` in this list.

### 5.12 Replacement and exchange orders (no link between orders)

From any order's row, card or details page, "Create new order" opens the create form pre-filled from that order (brand, customer, address, products). Two modes:
1. **Same order again** (for a dead order that came back as RTW): all products kept. New order `type = NORMAL`.
2. **Exchange order**: Support picks only the products that have a problem. New order `type = EXCHANGE`.

In both modes the new order gets `special_handling = replacement`, and Support may pick the `TURUQ` shipping handler. **Do not store any link or order-number reference between the new order and the old one.** Replacement orders are always created as **Turuq orders**, even if the source is an integration order.

### 5.13 Cancellation

- Cancel is allowed on orders that are not final and not already cancelled.
- The cancel form requires a `cancellation_reason`. For reasons with `requires_attachment = true`, at least one image is also required; the server rejects the request without it.
- On cancel: `status = cancelled`, update history and `last_status_changed_at`, set `cancelled_by = SUPPORT`, save reason and images, set `cancellation_review_status = PENDING` if images were attached (otherwise `NONE`), write audit.
- **Manual review of evidence:** the Cancellation Review page lists `PENDING` orders. Support opens the images and clicks Approve or Reject with a note. This sets `APPROVED` or `REJECTED`, reviewer, time, note.
- **Courier payment eligibility** (display only): on a cancelled order show "Courier payment: Eligible / Not eligible". Eligible when the status history contains `outForDelivery` AND the reason has `courier_payable_if_shipped = true`. The cancellation never changes the order back into a shipping status.

Seed `cancellation_reasons`:

| code | label | group | requires_attachment | courier_payable_if_shipped | legacy |
|---|---|---|---|---|---|
| WRONG_PHONE_NUMBER | Wrong Phone Number | COURIER_SIDE | yes | yes | no |
| INCORRECT_OR_INCOMPLETE_ADDRESS | Incorrect or Incomplete Address | COURIER_SIDE | yes | yes | no |
| MAX_DELIVERY_ATTEMPTS | Delivery Attempts Exhausted | COURIER_SIDE | yes | yes | no |
| CUSTOMER_REFUSED | Customer Refused Delivery | COURIER_SIDE | yes | yes | no |
| POSTPONEMENT_PERIOD_EXCEEDED | Postponement Period Exceeded | COURIER_SIDE | yes | yes | no |
| CUSTOMER_UNREACHABLE | Customer Unreachable | COURIER_SIDE | yes | yes | no |
| WRONG_ORDER | Wrong Order | OTHER | no | no | no |
| BAD_SIZE | Bad Size | OTHER | no | no | no |
| PROBLEM_WITH_PRODUCT | Problem With Product | OTHER | no | no | no |
| SENDER_CANCELLED | Sender Cancelled | OTHER | no | no | no |
| OTHER | Other | OTHER | no | no | no |
| PRODUCT_ISSUE | Product Issue | OTHER | no | no | yes |
| SHOPIFY | Cancelled from Shopify | OTHER | no | no | yes |
| WHATSAPP | Cancelled via WhatsApp | OTHER | no | no | yes |

Legacy reasons are not offered in the new-cancellation dropdown but must display correctly on old orders. The courier-payment column is illustrative placeholder policy.

### 5.14 Dropoff batches and the OTP

- Only **dropoff batches** have the unclosed-batch restriction. Trip batches do not.
- Each dropoff batch has a 6-digit `otp`. The OTP is shown to the **brand account**. The courier enters it in his own account to close the batch.
- **Restriction on assigning:** when creating or assigning a new dropoff batch to a courier, count that courier's batches with `status = OPEN` and `start_date` older than 2 days. If the count is 3 or more, reject with `409` and a message listing those batches. Batches newer than 2 days do not count. The courier can receive batches again when the count drops below 3.
- Closing: the courier submits the OTP; a wrong OTP returns an error; a correct OTP sets `CLOSED`, `end_date`, `finished_by`.

### 5.15 Customer success rate

Customer lookup uses orders from **our two tables only**. Success = `delivered` or `collected`. Failed = `returned`, `cancelled`, `RTW`. All other statuses are in progress and excluded. `success rate = success / (success + failed)`, shown as a percentage with the counts ("75%, 3 of 4 finished orders"). Keep the status sets in one constants file so the team can change them.

### 5.16 Verified addresses

When Support edits an order's address, or clicks "Confirm address" on an order, save the address into `verified_addresses` for that order's normalized phone, with the governorate, the staff member and the time. One phone can have many verified addresses (home, work). Never apply a verified address automatically: it is only ever a **suggestion** that a person must click.

### 5.17 Order lifecycle: statuses and where the order is

Every order starts as `pending`. What `pending` means depends on the brand's `service_scheme`:

- **Warehouse brand** (`WAREHOUSE`): the brand's stock is in the Turuq warehouse. A `pending` order is **in the warehouse** (`current_location = warehouse`).
- **Pickup brand** (`PICKUP`): the brand keeps its stock and hands over prepared orders. A `pending` order is **in the brand's storage** (`current_location = brand_storage`).
- When a courier takes the order from the warehouse or from the brand's storage, the status becomes **`pickedUp`** (`current_location = with_courier`).
- When the order arrives at the distribution center, the status becomes **`processing`** (`current_location = distribution_center`).
- From the distribution center the order goes to a Turuq courier or to Bosta/ShipBlu: **`outForDelivery`** (`with_courier` or `with_carrier`), then `delivered`, `postponed`, `unreachable`, `returned`, and so on.

Default locations for other statuses (prototype defaults used by the seed script; Support can override them with "Move to..."): `outOfStock` same as `pending`; `postponed`, `unreachable`, `invalidAddress` = `distribution_center`; `RTW` = `warehouse`; `returned` = `returns_team`; `delivered` and `collected` = no location. Do not seed `packed` or `QC`.

A cancelled order keeps the location it had when it was cancelled: cancelled after `pickedUp` means it was with the courier, and cancelled after `processing` means it was at the distribution center. The seed data and the "Cancelled before delivery" filter (5.11) follow this.

## 6. Screens and behaviors

Layout: left sidebar, top bar, content area. Top bar has the **Quick Order Lookup** box (section 6.3), a "Brand preview" toggle (6.13), and the user menu. Sidebar items: Dashboard, Orders, Stale Orders, Quick Lookup, Customer Lookup, Clients, Create Order, Cancellation Review, Dropoff Batches, Alerts, My Notes, Prototype Simulator, My Account.

### 6.1 Dashboard

Cards: open issue flags, urgent orders, stale orders with no action (default 48h), unhandled alerts, orders cancelled before delivery. Each card links to the matching filtered list.

### 6.2 Orders list, row and card

- Two tabs: **Turuq Orders** and **Integration Orders**, each reading its own table.
- Filters: brand (searchable), status, carrier/courier, issue flag (any open / type), special handling, current location, date range, free-text search (order number, customer name, phone, tracking number), plus the saved filters "Has open issue" and "Cancelled before delivery". Sort: `urgent` first, then newest. Server-side pagination.
- **Row** (the most-needed data first, left to right): brand, order number, status + "time since last update", who ships (Turuq courier / Bosta / ShipBlu), courier name and phone, customer (name, phone, governorate), tracking number if it exists, current location, issue flag badge (red) and special handling badge (urgent orange, VIP gold, replacement purple).
- Clicking a row opens a **card** (right-side drawer) with the same data plus quick actions: Open details, Open on carrier, Add issue flag, Set special handling, Create new order, Cancel. The goal is that Support rarely needs the details page.

### 6.3 Quick Order Lookup

A text box in the top bar (keyboard shortcut `/`) and a full Quick Lookup page with a large auto-focused input for barcode scanners (a scanner types digits and presses Enter, so the same input handles typing and scanning). It searches **both** tables by order number. If both return a match, show both. The result appears immediately without opening a card: order number, source, current status and last update, **courier name and phone, or "No courier assigned"**, current location, flags, and an expandable "More details" area (brand, customer, tracking, shipping handler).

### 6.4 Order details page

Sections: header (order number, source, status, badges), shipping panel (carrier, courier, tracking number, "Open on carrier" button), customer, products, money (subtotal, shipping, total, handler), current location with a "Move to..." control (audit logged), issue flags panel (list, add, resolve), special handling selector, cancellation panel (reason, images, review status, courier payment eligibility), previous addresses, timeline built from `status_history` (sorted by date), audit log tab, batch info. Action buttons follow the edit rules in 5.6.

### 6.5 Stale Orders

Two tabs (Turuq / Integration). Controls: hours threshold, brand, carrier/courier, status, and a toggle **"No action taken"**. Table columns: brand, order number, status, last update, **hours stale**, who ships, tracking, flag state. Oldest update first. Each row has **Take action**: a modal with issue type + note; saving creates the flag; the row shows "Action taken" and leaves the "No action taken" filter. A row link opens the card and details.

### 6.6 Issue flags and alerts

- Add flag modal: type, note. Resolve modal: optional note. Flags list shows reporter, time, state, resolver.
- **Alerts page:** two alert types (new flags, status updated on an order with an open flag), each with a **Handled** button. Filter: unhandled / all.

### 6.7 Create / edit order

- Order form, first field is a **brand selector with a search box** (type to filter brands). Then: customer name, phone, governorate, address, product picker (products of that brand, quantity, price), payment method and status, shipping handler (CUSTOMER / BRAND / TURUQ), can-open-package, notes. Totals recalculate by 5.4. Creates a Turuq order.
- On save: run address and phone validation (5.2, 5.3) and create automatic flags if needed. If the phone has verified addresses, show them as **suggestions** next to the address field (filter by the same governorate first); only apply when the user clicks.
- The same form edits an existing order, with the brand read-only and fields limited by 5.6.
- "Previous addresses" button on the order (card and details): lists verified addresses for the order's phone, newest first. Selecting one applies it to the order (subject to the edit rules) and writes audit.

### 6.8 Create new order from an old order

The button described in 5.12, available on row, card and details.

### 6.9 Customer Lookup

Search by phone (normalized). Show: all names used with that phone, all addresses used (from orders) and verified addresses, the success rate (5.15), and a table of the customer's orders from both sources (order number, source, brand, status, date, total). Opening an order goes to its details.

### 6.10 Clients and performance graphs

- Clients list (search by name) and a client details page with the usual info and a **Performance** tab.
- **Today snapshot:** cards for total orders today and the difference from yesterday; orders by source (Turuq / Integration); orders by status (donut or bar). Refreshes on open, plus a refresh button.
- **Performance:** time filter (today, 7, 30, 90 days, custom range) and grouping (day, week, month). Charts: orders over time by source (line), status distribution (bar), delivered vs returned vs cancelled rate (bar or line). Aggregate both order tables by `created_at` for the client. Source split is only Turuq vs Integration.

### 6.11 Cancellation Review

List of orders with `cancellation_review_status = PENDING`. Detail view shows the reason and the attached images, with Approve and Reject buttons and a note field (5.13).

### 6.12 Dropoff Batches and My Notes

- **Dropoff Batches:** list with courier, destination, start date, status, and an "unclosed older than 2 days" counter per courier. A **Create batch** form (courier, destination, orders to include) that enforces 5.14 and shows the 409 message clearly.
- **My Notes:** private notes for the logged-in staff member: add, edit, delete, "Done" checkbox, search box. No link to orders and nobody else sees them.

### 6.13 Brand preview toggle

A top-bar toggle that renders order pages **as a brand would see them**: carrier name, courier, tracking number and link, current location, internal notes, issue flags and special handling are hidden; only the unified status and the customer data remain. This demonstrates the rule that brands never see Bosta or ShipBlu. (A real implementation hides these in the API; here it is a UI demo.)

### 6.14 Prototype Simulator

A panel for demo only, with:
- **Change order status** (any status except `processing` to `pending`): behaves like a courier/carrier update (5.7).
- **Report a flag as** brand / warehouse / distribution center: creates a flag with that reporter role.
- **Brand screen (OTP):** pick a brand, see its dropoff batches and their OTPs.
- **Courier screen:** pick a courier and a batch, enter an OTP to close it (5.14).
- **Outbox:** view `brand_email_outbox`.

## 7. Server API (Next.js route handlers)

- `POST /auth/login`, `GET /me`
- `GET /orders?model=&filters&sort&page`, `GET /orders/:model/:id`
- `POST /orders` (create Turuq order), `PATCH /orders/:model/:id` (edit rules 5.6)
- `POST /orders/:model/:id/cancel`, `POST /orders/:model/:id/confirm-address`, `POST /orders/:model/:id/apply-address`
- `PATCH /orders/:model/:id/special-handling`, `PATCH /orders/:model/:id/location`
- `POST /orders/:model/:id/flags`, `POST /orders/:model/:id/flags/:flagId/resolve`
- `GET /orders/stale?model=&hours=&noAction=&filters`
- `GET /lookup/order?q=` (both tables), `GET /lookup/customer?phone=`
- `GET /clients`, `GET /clients/:id`, `GET /clients/:id/stats/today`, `GET /clients/:id/stats/performance?from=&to=&groupBy=`
- `GET /cancellation-review`, `POST /cancellation-review/:model/:id`
- `GET /dropoff-batches`, `POST /dropoff-batches`, `POST /dropoff-batches/:id/close`
- `GET /alerts`, `POST /alerts/:id/handled`
- `GET|POST|PATCH|DELETE /notes`
- `POST /demo/orders/:model/:id/status`, `POST /demo/flags`

## 8. Seed data

The seed script (`npm run seed`) must be re-runnable and must only touch this prototype's collections. Generate realistic, internally consistent data:

- **Staff:** the 4 support accounts of section 3.
- **20 brands (clients):** 10 with `service_scheme = WAREHOUSE` and 10 with `PICKUP`. Invent plausible fictional Egyptian e-commerce brand names (for example Nile Wear, Cairo Home, Glow Cosmetics, Tech Souk, Baby Corner). Each has a unique `company_name`, a phone and an email. Roughly 3 to 5 products per brand (about 80 products).
- **20 couriers:** **Bosta** and **ShipBlu** (`outsourced = true`) plus **18 Turuq couriers** with Egyptian names, phones, usernames and zones (Cairo, Giza, Alexandria, and so on).
- **50 customers:** each customer is a valid Egyptian mobile number with a name and a governorate, and one to three different addresses (some addresses deliberately invalid: `شارع معز الدولة`, `Moez Street`, `New Cairo`). A few customers appear with slightly different name spellings across orders. Include 2 invalid phone numbers.
- **200 orders** created over the last 90 days: about 130 Turuq orders and 70 Integration orders (Integration orders use Shopify, WooCommerce or OpenAPI as `provider`). Every order belongs to one of the 50 customers and one of the 20 brands, so each customer has about 4 orders on average (a few have 8 to 10, a few have 1). Some phone numbers must appear in **both** collections.
- **Status distribution of the 200 orders (approximate):** delivered 80, collected 10, outForDelivery 15, pending 15, pickedUp 10, processing 15, postponed 6, unreachable 5, invalidAddress 4, outOfStock 6, returned 10, RTW 6, cancelled 18.
- **Consistency:** `status_history` must follow the lifecycle of 5.17 (`pending`, then `pickedUp`, then `processing`, then `outForDelivery`, then the final status), with increasing dates and only the statuses the order really reached. `last_status_changed_at` equals the date of the current status. `current_location` follows 5.17 and the brand's `service_scheme`.
- **Carrier orders:** orders shipped with Bosta or ShipBlu have a `tracking_number` (examples: Bosta `4696998616`, ShipBlu `3362449`; invent more). Orders shipped by Turuq couriers have no tracking number.
- **Scenario data to include:**
  - about 20 **stale** orders (not final, last status change 3 to 6 days ago), some already with open flags;
  - about 8 orders **cancelled before delivery** (history only has pending/pickedUp/processing plus cancelled), some after `pickedUp` and some after `processing`, each with the matching location;
  - the out-of-stock orders: most with a history of only `pending` and `outOfStock`, and one that also passed another status;
  - 3 orders with `shipping_handled_by = TURUQ` and 0 shipping fees;
  - cancelled orders with reasons from the table in 5.13 and placeholder evidence images, some with `PENDING` review;
  - about 15 open issue flags of different types and reporter roles (including `system`, `brand`, `warehouse`, `distribution_center`), a few resolved flags, and matching alerts;
  - a few orders with `special_handling` of `urgent`, `vip` and `replacement`;
  - a few verified addresses for some customers.
- **Dropoff batches:** one courier with **3 open batches older than 2 days** (so creating a new batch for that courier is blocked), another courier with 1 old open batch, plus a few closed ones. Each has an OTP. Add a few trip batches.
- **Notes:** 2 or 3 private notes for each support account.

## 9. Visual style

Clean modern admin dashboard, light theme, neutral grays with one primary color (indigo or blue). Compact data tables. Status badges with distinct colors. Issue flag = red, urgent = orange, VIP = gold, replacement = purple. Empty states, loading states and error toasts everywhere. Desktop-first; usable on tablet.

## 10. Quality rules

- No business rule only in the UI. Every restriction in section 5 is checked on the server and returns a readable error.
- All lists use server-side filtering and pagination, and the Stale Orders query must be efficient (index on `(status, last_status_changed_at)` and on `has_open_issue`).
- Every write that changes an order writes `order_audit_log`.
- Keep rule constants (final statuses, success-rate sets, address rule, cancellation reasons) in one place.

## 11. Acceptance scenarios (the prototype must pass these)

1. Log in as any of the four support accounts (for example `mona.support`). Open Orders; switch between the Turuq and Integration tabs. Re-running `npm run seed` restores the demo data.
2. Quick Lookup an order number: status and courier (or "No courier assigned") appear immediately.
3. Open a Bosta order: the button opens `https://business.bosta.co/orders/<tracking>`. Open a ShipBlu order: it opens `https://app.shipblu.com/order/<tracking>`. A Turuq-courier order shows no carrier button.
4. Stale Orders: with "No action taken" on, take action on one order; it leaves the filtered list and shows "Action taken".
5. Simulate a status change on an order with an open flag: an alert appears and the flag stays open until resolved manually.
6. Edit a `processing` order: only address, subtotal and total are editable; a brand email appears in the outbox; the audit log shows old and new values. Trying to set it back to `pending` fails.
7. Edit the address of an out-of-stock order that only had pending/outOfStock: allowed. The one that passed another status: blocked.
8. Create an order with an invalid address and phone: the order saves and two system flags appear. A phone with verified addresses shows suggestions that apply only on click.
9. Create a new order from a cancelled/RTW order in both modes; each gets `replacement`; the `TURUQ` handler makes shipping 0.
10. Cancel an order with `CUSTOMER_UNREACHABLE` without an image: rejected. With an image: it goes to Cancellation Review; approve it.
11. Customer Lookup by phone shows names, addresses, order list from both tables and the success rate.
12. Create a dropoff batch for the courier with 3 old open batches: blocked with a clear message. Close a batch in the simulator with the wrong OTP (error) and the right OTP (closed).
13. Turn on Brand preview: carrier, courier, tracking, location, flags and special handling disappear.
14. Client Performance tab: change the range and grouping; both charts update.

## 12. Recommended build order

1. Next.js project, MongoDB connection from `MONGODB_URI`, models and indexes, the seed script, login, layout, My Account.
2. Orders list with two tabs, row and card, filters; order details page; audit log.
3. Quick Lookup, tracking links, current location, special handling, issue flags, alerts, simulator.
4. Stale Orders and the "Cancelled before delivery" filter.
5. Create/edit order, edit rules, address and phone validation, verified addresses, replacement/exchange.
6. Cancellation flow, Cancellation Review, courier payment display.
7. Customer Lookup, Clients and performance graphs.
8. Dropoff Batches with the restriction and OTP flow, My Notes, Brand preview.

## 13. Additional confirmed setup requirements

This section records the additional environment and seed-data details confirmed for this prototype. The existing sections above remain the primary detailed specification for the implementation.

### 13.1 Environment

- Frontend framework: **Next.js**.
- Database provider: **MongoDB Atlas**, using the test database/cluster supplied for this prototype.
- Configure the connection through `MONGODB_URI` in `.env.local`; configure the database name explicitly through `MONGODB_DB` (for example, `support_prototype`). Do not place database credentials or the complete connection URI in source code, this specification, commits, or other shared files.
mongo url: mongodb+srv://marwanmamdouh159_db_user:jqd8APGDKGTh0TiF@cluster0.jxzqem6.mongodb.net/
- The `.env.local` file must be excluded from version control. Use the hosting provider's secret settings for any deployed test environment.
- The database URI shared during setup contains credentials. Rotate the database user's password before using the URI, then store the new URI only in the environment configuration.

Example `.env.local` configuration (replace the placeholder with the rotated test-database URI locally; do not commit this file):

```dotenv
MONGODB_URI="<ROTATED_MONGODB_ATLAS_TEST_URI>"
MONGODB_DB="support_prototype"
```

### 13.2 Required demo data counts

- Create exactly **4 Support accounts**, using the accounts and prototype credentials defined in Section 3.
- Create **20 couriers in total**: Bosta and ShipBlu as outsourced carriers, plus 18 Turuq couriers.
- Create approximately **200 orders** containing customer data, associated with approximately **50 customers**. Follow the source split and status distribution specified in Section 8.
- Create **20 brands/clients** in total: 10 with `service_scheme = WAREHOUSE` and 10 with `service_scheme = PICKUP`.
- Seed data must be realistic, internally consistent, and repeatable through `npm run seed`, without modifying collections outside this prototype.

### 13.3 Confirmed order lifecycle and location rules

- A new order starts with status `pending`.
- For a `WAREHOUSE` brand, a pending order is located in the Turuq warehouse (`current_location = warehouse`).
- For a `PICKUP` brand, a pending order is located in the brand's storage (`current_location = brand_storage`).
- When a courier takes the order from the warehouse or the brand's storage, its status changes to `pickedUp` and its location becomes `with_courier`.
- When the order arrives at the distribution center, its status changes to `processing` and its location becomes `distribution_center`.
- Continue subsequent shipping statuses and location changes according to Section 5.17. Enforce these business rules on the server, not only in the user interface.
