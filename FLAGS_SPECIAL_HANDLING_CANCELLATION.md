# FLAGS, SPECIAL HANDLING & CANCELLATION REASONS
# الأعلام، المعالجة الخاصة، وأسباب الإلغاء

Bilingual reference (English / Arabic).  
مرجع ثنائي اللغة (English / Arabic).

---

## 1. ISSUE FLAGS (`ISSUE_FLAG_TYPES`)
## 1. أعلام المشاكل (ISSUE_FLAG_TYPES)

Defined in `lib/rules/constants.ts`. Each flag has `state` ("open" / "resolved"), `note`, `reportedByRole`, `reportedByUser`, `reportedAt`, `resolvedBy`, `resolvedAt`, `resolveNote`.

معرّفة في `lib/rules/constants.ts`. كل علم يحتوي على `state` ("open"/"resolved")، `note`، `reportedByRole`، `reportedByUser`، `reportedAt`، `resolvedBy`، `resolvedAt`، `resolveNote`.

| # | Code | English | Arabic (العربية) | Auto-triggered? | Trigger condition |
|---|------|---------|------------------|-----------------|-------------------|
| 1 | `ticket` | TICKET | تذكرة | Manual only | — |
| 2 | `return_missing_items` | RETURN MISSING ITEMS | عناصر مفقودة في المرتجع | Manual only | — |
| 3 | `return_wrong_items` | RETURN WRONG ITEMS | عناصر خاطئة في المرتجع | Manual only | — |
| 4 | `invalid_address` | INVALID ADDRESS | عنوان غير صالح | Auto | Address fails `isAddressValid` (length<15, <3 words, no digit/street word) on create/update/apply-address |
| 5 | `invalid_phone_number` | INVALID PHONE NUMBER | رقم هاتف غير صالح | Auto | Phone fails `isValidPhone` on create/update |
| 6 | `delayed_shipment` | DELAYED SHIPMENT | شحنة متأخرة | Manual only | — |
| 7 | `defective_items` | DEFECTIVE ITEMS | عناصر معيبة | Auto | Cancel with `PROBLEM_WITH_PRODUCT` / `BAD_SIZE` / `WRONG_ORDER` |
| 8 | `outOfStock` | OUT OF STOCK | نفد المخزون | Auto | Product quantity exceeds available stock on create/update |
| 9 | `address_update_required` | ADDRESS UPDATE REQUIRED | تحديث العنوان مطلوب | Auto | Governorate changed without address update (PATCH) |
| 10 | `courier_finance_alert` | COURIER FINANCE ALERT | تنبيه مالي للمندوب | Auto | Finance data changed while order location is `with_courier` |
| 11 | `reprint_bill_of_lading` | REPRINT BILL OF LADING | إعادة طباعة بوليصة الشحن | Auto | Phone/address/products updated at certain statuses (see UPDATE_FLOW_RULES.md) |
| 12 | `courier_products_alert` | COURIER PRODUCTS ALERT | تحديث المندوب بالمنتجات | Auto | Refund products updated at Out for delivery |
| 13 | `courier_phone_alert` | COURIER PHONE ALERT | تحديث المندوب برقم الهاتف | Auto | Phone updated at Out for delivery |
| 14 | `courier_address_alert` | COURIER ADDRESS ALERT | تحديث المندوب بالعنوان | Auto | Address updated at Out for delivery |
| 15 | `other` | OTHER | أخرى | Manual only | — |

### Reporter roles (`REPORTER_ROLES`) / أدوار المبلّغ
`system` (النظام), `brand` (العلامة), `support` (الدعم), `warehouse` (المستودع), `distribution_center` (مركز التوزيع)

### Flag auto-resolve / حل تلقائي للأعلام
- `invalid_address` / `invalid_phone_number`: resolved when the field becomes valid.  
  محلول when the field becomes valid.
- `address_update_required`: resolved when address is updated.  
  محلول عند تحديث العنوان.
- `courier_finance_alert`: resolved when location leaves `with_courier`.  
  محلول when location leaves `with_courier`.
- `reprint_bill_of_lading` / `courier_*_alert`: resolved on status change.  
  محلول عند تغيير الحالة.

### Alerts / التنبيهات
- `NEW_FLAG`: created when a flag is added (open).  
  يُنشأ when a flag is added (open).
- `STATUS_UPDATED`: created when status changes on an order with an open flag.  
  يُنشأ when status changes on an order with an open flag.

---

## 2. Special Handling (`SPECIAL_HANDLING`)
## 2. المعالجة الخاصة (SPECIAL_HANDLING)

Defined in `lib/rules/constants.ts`.

معرّفة في `lib/rules/constants.ts`.

| Code | English | Arabic (العربية) | Auto-suggested? | Trigger |
|------|---------|------------------|-----------------|---------|
| `none` | NONE | لا يوجد | Default | — |
| `urgent` | URGENT | عاجل | Manual only | — |
| `vip` | VIP | عميل مميز | Auto (optional) | Customer has ≥ N prior orders by phone |
| `replacement` | REPLACEMENT | استبدال | Auto | Order type === `EXCHANGE` |

Auto-suggestion only sets the value when current is `none`; never overrides a manual choice.  
الاقتراح التلقائي sets the value when current is `none` only; never overrides manual choice.

---

## 3. Cancellation Reasons (`CANCELLATION_REASONS`)
## 3. أسباب الإلغاء (CANCELLATION_REASONS)

Defined in `lib/rules/cancellationReasons.ts`. 14 total; 11 active (non-legacy).

معرّفة في `lib/rules/cancellationReasons.ts`. 14 total; 11 active (non-legacy).

### All cancellation reasons (single list)
### جميع أسباب الإلغاء (قائمة واحدة)

| Code | English | Arabic (العربية) | Group | Attachment? | Courier payable? | Legacy? |
|------|---------|------------------|-------|-------------|------------------|---------|
| `WRONG_PHONE_NUMBER` | WRONG PHONE NUMBER | رقم هاتف خاطئ | COURIER_SIDE | Yes | Yes | No |
| `INCORRECT_OR_INCOMPLETE_ADDRESS` | INCORRECT OR INCOMPLETE ADDRESS | عنوان غير صحيح أو غير كامل | COURIER_SIDE | Yes | Yes | No |
| `MAX_DELIVERY_ATTEMPTS` | DELIVERY ATTEMPTS EXHAUSTED | استنفاد محاولات التسليم | COURIER_SIDE | Yes | Yes | No |
| `CUSTOMER_REFUSED` | CUSTOMER REFUSED DELIVERY | رفض العميل للتسليم | COURIER_SIDE | Yes | Yes | No |
| `POSTPONEMENT_PERIOD_EXCEEDED` | POSTPONEMENT PERIOD EXCEEDED | تجاوز فترة التأجيل | COURIER_SIDE | Yes | Yes | No |
| `CUSTOMER_UNREACHABLE` | CUSTOMER UNREACHABLE | العميل غير متاح | COURIER_SIDE | Yes | Yes | No |
| `WRONG_ORDER` | WRONG ORDER | طلب خاطئ | OTHER | No | No | No |
| `BAD_SIZE` | BAD SIZE | مقاس غير مناسب | OTHER | No | No | No |
| `PROBLEM_WITH_PRODUCT` | PROBLEM WITH PRODUCT | مشكلة في المنتج | OTHER | No | No | No |
| `SENDER_CANCELLED` | SENDER CANCELLED | إلغاء المرسل | OTHER | No | No | No |
| `OTHER` | OTHER | أخرى | OTHER | No | No | No |
| `PRODUCT_ISSUE` | PRODUCT ISSUE | مشكلة في المنتج (قديم) | OTHER | No | No | Yes (legacy) |
| `SHOPIFY` | CANCELLED FROM SHOPIFY | إلغاء من Shopify | OTHER | No | No | Yes (legacy) |
| `WHATSAPP` | CANCELLED VIA WHATSAPP | إلغاء عبر WhatsApp | OTHER | No | No | Yes (legacy) |

### Reason → Flag mapping (auto on cancel)
### ربط السبب → علم (تلقائي عند الإلغاء)

| Cancellation reason | Flag added |
|---|---|
| `WRONG_PHONE_NUMBER` | `invalid_phone_number` |
| `CUSTOMER_UNREACHABLE` | `invalid_phone_number` |
| `INCORRECT_OR_INCOMPLETE_ADDRESS` | `invalid_address` |
| `PROBLEM_WITH_PRODUCT` | `defective_items` |
| `BAD_SIZE` | `defective_items` |
| `WRONG_ORDER` | `defective_items` |
| (others, including `MAX_DELIVERY_ATTEMPTS`) | none |

### Cancellation review statuses / حالات مراجعة الإلغاء
`NONE` (لا يوجد), `PENDING` (قيد الانتظار), `APPROVED` (موافق عليه), `REJECTED` (مرفوض)

### Cancelled by / تم الإلغاء بواسطة
`SUPPORT` (الدعم), `BRAND` (العلامة), `COURIER` (المندوب), `SYSTEM` (النظام)
