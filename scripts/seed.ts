import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/db";
import {
  StaffMember, Client, Courier, Product, TuruqOrder, IntegrationOrder,
  Alert, AuditLog, SupportNote, TripBatch, DropoffBatch,
  BrandEmailOutbox,
} from "../lib/models";
import { normalizePhone, isValidPhone } from "../lib/rules/phone";
import { isAddressValid } from "../lib/rules/address";
import { computeTotal } from "../lib/rules/shipping";
import { defaultShippingFee } from "../lib/rules/constants";
import { FINAL_STATUSES } from "../lib/rules/constants";

const brandNames = ["Nile Wear", "Cairo Home", "Glow Cosmetics", "Tech Souk", "Baby Corner", "Desert Bloom"];

const turuqCourierNames = [
  "Ahmed Hassan", "Mohamed Ali", "Youssef Ibrahim", "Khaled Mahmoud", "Omar Sayed",
  "Hassan Farouk", "Tarek Nabil", "Amr Khaled", "Mostafa Adel", "Karim Samir",
  "Mahmoud Reda", "Sherif Lotfy", "Wael Gamal", "Hany Fawzy", "Bassem Yehia",
  "Nader Magdy", "Ramy Fouad", "Samy Tawfik",
];

const zones = ["Cairo", "Giza", "Alexandria", "Qalyubia", "Sharqia", "Gharbia", "Dakahlia", "Fayoum"];

const customerFirst = ["Ahmed", "Mohamed", "Ali", "Omar", "Youssef", "Fatma", "Mona", "Sara", "Nour", "Yasmin", "Hana", "Laila", "Karim", "Hassan", "Tarek"];
const customerLast = ["Hassan", "Ali", "Ibrahim", "Mahmoud", "Ahmed", "Mohamed", "Sayed", "Farouk", "Nabil", "Khaled", "Adel", "Fathy"];
const governorates = [
  'Cairo', 'Giza', 'Helwan', '6th of October', 'Alexandria', 'Suez', 'Ismailia', 'Fayed',
  'Port Said', 'Dakahlia', 'Qalyubia', 'Menoufia', 'Sharkeya', 'Gharbeya', 'Beheira',
  'Kafr El Sheikh', 'Damietta', 'Beni Suef', 'Minya', 'Fayoum', 'Asyut', 'Sohag', 'Qena',
  'Luxor', 'Aswan', 'Red Sea', 'South Sinai', 'North Sinai', 'New Valley', 'Matrouh',
];

const validAddresses = [
  "12 Tahrir Street, Apt 4, Cairo",
  "5 Building 7, 90th Street, New Cairo, Cairo",
  "23 El Nasr Road, Nasr City, Cairo",
  "8 Nile Corniche, Apt 12, Giza",
  "45 Haram Street, Giza",
  "10 El Geish Road, Alexandria",
  "7 Smouha Street, Alexandria",
  "3 Ramses Street, Cairo",
  "18 October 6 City, Giza",
  "22 El Merghany, Heliopolis, Cairo",
];
const invalidAddresses = ["شارع معز الدولة", "Moez Street", "New Cairo"];

const productItems = [
  { desc: "T-Shirt", price: 250 }, { desc: "Jeans", price: 600 }, { desc: "Sneakers", price: 900 },
  { desc: "Hoodie", price: 450 }, { desc: "Dress", price: 700 }, { desc: "Jacket", price: 1200 },
  { desc: "Bag", price: 350 }, { desc: "Watch", price: 1500 }, { desc: "Perfume", price: 800 },
];

const colors = ["Black", "White", "Blue", "Red", "Green", "Beige"];
const sizes = ["S", "M", "L", "XL", "One Size"];

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uid() { return "uid-" + Math.random().toString(36).slice(2, 10); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(rndInt(8, 20), rndInt(0, 59), 0, 0); return d; }
function oid(prefix: string, n: number) { return `${prefix}-${100000 + n}`; }

const cancellationReasonsSeed = [
  { code: "WRONG_PHONE_NUMBER", label: "Wrong Phone Number", group: "COURIER_SIDE", requiresAttachment: true, courierPayableIfShipped: true, legacy: false },
  { code: "INCORRECT_OR_INCOMPLETE_ADDRESS", label: "Incorrect or Incomplete Address", group: "COURIER_SIDE", requiresAttachment: true, courierPayableIfShipped: true, legacy: false },
  { code: "MAX_DELIVERY_ATTEMPTS", label: "Delivery Attempts Exhausted", group: "COURIER_SIDE", requiresAttachment: true, courierPayableIfShipped: true, legacy: false },
  { code: "CUSTOMER_REFUSED", label: "Customer Refused Delivery", group: "COURIER_SIDE", requiresAttachment: true, courierPayableIfShipped: true, legacy: false },
  { code: "POSTPONEMENT_PERIOD_EXCEEDED", label: "Postponement Period Exceeded", group: "COURIER_SIDE", requiresAttachment: true, courierPayableIfShipped: true, legacy: false },
  { code: "CUSTOMER_UNREACHABLE", label: "Customer Unreachable", group: "COURIER_SIDE", requiresAttachment: true, courierPayableIfShipped: true, legacy: false },
  { code: "WRONG_ORDER", label: "Wrong Order", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: false },
  { code: "BAD_SIZE", label: "Bad Size", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: false },
  { code: "PROBLEM_WITH_PRODUCT", label: "Problem With Product", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: false },
  { code: "SENDER_CANCELLED", label: "Sender Cancelled", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: false },
  { code: "OTHER", label: "Other", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: false },
  { code: "PRODUCT_ISSUE", label: "Product Issue", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: true },
  { code: "SHOPIFY", label: "Cancelled from Shopify", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: true },
  { code: "WHATSAPP", label: "Cancelled via WhatsApp", group: "OTHER", requiresAttachment: false, courierPayableIfShipped: false, legacy: true },
];

async function main() {
  await connectDB();
  const collections = [
    "staff_members", "clients", "couriers", "products", "turuq_orders", "integration_orders",
    "alerts", "order_audit_log", "support_notes", "trip_batches",
    "dropoff_batches", "brand_email_outbox",
  ];
  for (const c of collections) {
    try { await mongoose.connection.collection(c).deleteMany({}); } catch {}
  }
  console.log("cleared");

  // Staff
  const passwordHash = await bcrypt.hash("support123", 10);
  const staffData = [
    { name: "Mona Adel", username: "mona.support", email: "mona.support@turuq.com", phone: "01012345678" },
    { name: "Omar Fathy", username: "omar.support", email: "omar.support@turuq.com", phone: "01123456789" },
    { name: "Salma Ibrahim", username: "salma.support", email: "salma.support@turuq.com", phone: "01234567890" },
    { name: "Hassan Mostafa", username: "hassan.support", email: "hassan.support@turuq.com", phone: "01512345678" },
  ];
  const staff = await StaffMember.insertMany(staffData.map((s) => ({ ...s, role: "SUPPORT", active: true, passwordHash })));
  console.log("staff", staff.length);

  // Clients (6 brands)
  const clients = [];
  for (let i = 0; i < 6; i++) {
    clients.push({
      name: brandNames[i],
      companyName: brandNames[i],
      phone: `010${String(10000000 + i).slice(0, 8)}`,
      email: `${brandNames[i].toLowerCase().replace(/\s+/g, "")}@example.com`,
      serviceScheme: i < 3 ? "WAREHOUSE" : "PICKUP",
      active: true,
    });
  }
  const clientDocs = await Client.insertMany(clients);
  console.log("clients", clientDocs.length);

  // Couriers
  const couriers: any[] = [
    { name: "Bosta", phone: "01000000001", username: "bosta", outsourced: true, zone: "All", active: true },
    { name: "ShipBlu", phone: "01000000002", username: "shipblu", outsourced: true, zone: "All", active: true },
  ];
  for (let i = 0; i < 18; i++) {
    couriers.push({
      name: turuqCourierNames[i],
      phone: `011${String(20000000 + i).slice(0, 8)}`,
      username: turuqCourierNames[i].toLowerCase().replace(/\s+/g, "."),
      outsourced: false,
      zone: zones[i % zones.length],
      active: true,
    });
  }
  const courierDocs = await Courier.insertMany(couriers);
  const bosta = courierDocs[0];
  const shipblu = courierDocs[1];
  const turuqCouriers = courierDocs.slice(2);
  console.log("couriers", courierDocs.length);

  // Products: 4 per client
  const productDocs = [];
  for (const c of clientDocs) {
    for (let i = 0; i < 4; i++) {
      const it = rnd(productItems);
      productDocs.push({
        uid: uid(),
        itemDescription: it.desc,
        primaryClientId: c._id,
        quantity: rndInt(10, 200),
        unitPrice: it.price,
        size: rnd(sizes),
        color: rnd(colors),
      });
    }
  }
  const products = await Product.insertMany(productDocs);
  console.log("products", products.length);

  // Customers (15)
  interface CustomerT { name: string; phone: string; gov: string; addresses: string[]; normalized: string; validPhone: boolean; }
  const customers: CustomerT[] = [];
  for (let i = 0; i < 13; i++) {
    const first = rnd(customerFirst);
    const last = rnd(customerLast);
    const phone = `01${rnd(["0", "1", "2", "5"])}${String(10000000 + i * 137).slice(0, 8)}`;
    const gov = rnd(governorates);
    const numAddr = rndInt(1, 3);
    const addresses: string[] = [];
    for (let a = 0; a < numAddr; a++) {
      if (Math.random() < 0.25) addresses.push(rnd(invalidAddresses));
      else addresses.push(rnd(validAddresses));
    }
    customers.push({ name: `${first} ${last}`, phone, gov, addresses, normalized: normalizePhone(phone), validPhone: true });
  }
  customers.push({ name: "Bad Phone One", phone: "12345", gov: "Cairo", addresses: [rnd(validAddresses)], normalized: normalizePhone("12345"), validPhone: false });
  customers.push({ name: "Bad Phone Two", phone: "010123", gov: "Giza", addresses: [rnd(invalidAddresses)], normalized: normalizePhone("010123"), validPhone: false });

  // Status distribution for 50 orders (all timelines)
  const statusList: string[] = [];
  const dist: Record<string, number> = {
    delivered: 12, collected: 2, outForDelivery: 4, pending: 4, pickedUp: 3,
    processing: 4, postponed: 2, outOfStock: 2, returned: 3, RTW: 2, RTO: 2, cancelled: 5,
    // cancelled->returned flow: 2 orders that are returned after cancelled (handled in history)
  };
  dist.delivered = 11; // adjust to 50
  for (const [s, n] of Object.entries(dist)) for (let i = 0; i < n; i++) statusList.push(s);
  // ensure 50
  while (statusList.length < 50) statusList.push("delivered");
  while (statusList.length > 50) statusList.pop();
  for (let i = statusList.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [statusList[i], statusList[j]] = [statusList[j], statusList[i]]; }
  console.log("status count", statusList.length);

  function buildHistory(status: string, baseDate: Date, serviceScheme: string, cancelledThenReturned: boolean, isRefund: boolean): { history: Record<string, string>; lastChanged: Date; location: string | null } {
    const path: string[] = ["pending"];
    const outOfStockPassedOther = status === "outOfStock" && Math.random() < 0.3;

    if (status === "outOfStock" && !outOfStockPassedOther) {
      // only pending + outOfStock
    } else if (status !== "pending") {
      const reachedPickedUp = !isRefund && ["pickedUp", "processing", "outForDelivery", "postponed", "delivered", "collected", "returned", "RTW", "RTO", "cancelled"].includes(status);
      if (reachedPickedUp) path.push("pickedUp");
      if (["processing", "outForDelivery", "postponed", "delivered", "collected", "returned", "RTW", "RTO", "cancelled"].includes(status)) {
        path.push("processing");
      }
      if (["outForDelivery", "delivered", "collected", "postponed", "returned", "RTW", "RTO"].includes(status)) {
        path.push("outForDelivery");
      }
      // delivered before QC for returned/RTW/RTO flows
      if (["returned", "RTW", "RTO"].includes(status)) {
        if (!path.includes("delivered")) path.push("delivered");
        path.push("QC");
      }
      if (status === "cancelled" && Math.random() < 0.5) {
        const idx = path.indexOf("outForDelivery");
        if (idx !== -1) path.splice(idx, 1);
      }
      if (status === "outOfStock" && outOfStockPassedOther) {
        path.push("pickedUp");
        path.push("processing");
      }
      // cancelled then returned: add cancelled before returned
      if (cancelledThenReturned && status === "returned") {
        if (!path.includes("cancelled")) path.push("cancelled");
      }
    }
    if (status === "outOfStock" && outOfStockPassedOther) {
      if (!path.includes("outOfStock")) path.push("outOfStock");
    }
    if (!path.includes(status)) path.push(status);
    const dedup: string[] = [];
    for (const s of path) if (dedup[dedup.length - 1] !== s) dedup.push(s);

    const history: Record<string, string> = {};
    const totalSpan = rndInt(2, 14);
    const step = totalSpan / dedup.length;
    dedup.forEach((s, idx) => {
      const d = new Date(baseDate.getTime() - (dedup.length - 1 - idx) * step * 24 * 60 * 60 * 1000);
      history[s] = d.toISOString();
    });
    const lastChanged = new Date(history[status]);

    let location: string | null = null;
    const scheme = serviceScheme;
    if (status === "pending") location = scheme === "WAREHOUSE" ? "warehouse" : "brand_storage";
    else if (status === "outOfStock") location = scheme === "WAREHOUSE" ? "warehouse" : "brand_storage";
    else if (status === "pickedUp") location = "with_courier";
    else if (status === "processing") location = "distribution_center";
    else if (status === "postponed") location = "distribution_center";
    else if (status === "outForDelivery") location = Math.random() < 0.5 ? "with_courier" : "with_carrier";
    else if (status === "RTW") location = "warehouse";
    else if (status === "RTO") location = "brand_storage";
    else if (status === "returned") location = cancelledThenReturned ? "returns_team" : "returns_team";
    else if (status === "cancelled") {
      if (history["processing"]) location = "distribution_center";
      else if (history["pickedUp"]) location = "with_courier";
      else location = scheme === "WAREHOUSE" ? "warehouse" : "brand_storage";
    } else {
      location = null;
    }
    return { history, lastChanged, location };
  }

  const orderTypes = ["NORMAL", "PROMOTIONAL", "REFUND", "EXCHANGE"];

  const turuqTarget = 33;
  const ordersCreated: { model: string; id: any; status: string }[] = [];
  const staleCandidates: any[] = [];

  for (let i = 0; i < 50; i++) {
    let status = statusList[i];
    // order type: distribute across all 4
    const orderType = rnd(orderTypes);
    // REFUND orders: pending -> processing -> outForDelivery -> delivered -> QC -> RTW/RTO (no pickedUp, no cancelled/returned)
    if (orderType === "REFUND") {
      status = rnd(["pending", "processing", "outForDelivery", "delivered", "RTW", "RTO", "RTW", "RTO"]);
    }
    const model2 = i < turuqTarget ? "turuq" : "integration";
    const customer = rnd(customers);
    const client = rnd(clientDocs);
    const serviceScheme = client.serviceScheme;

    let baseDate = daysAgo(rndInt(0, 89));
    const isFinal = FINAL_STATUSES.has(status as any);
    let makeStale = !isFinal && Math.random() < 0.25 && staleCandidates.length < 6;
    if (makeStale) baseDate = daysAgo(rndInt(3, 6));

    // cancelled then returned: only for returned status, ~40% (refund orders are never cancelled first)
    const cancelledThenReturned = (status === "returned") && orderType !== "REFUND" && Math.random() < 0.4;
    const isRefund = orderType === "REFUND";

    const { history, lastChanged, location } = buildHistory(status, baseDate, serviceScheme, cancelledThenReturned, isRefund);

    // courier assignment
    let courierId: any = null;
    let trackingNumber: string | null = null;
    const cancelledReachedPickup = status === "cancelled" && !!history["pickedUp"];

    if (status === "pending" || status === "outOfStock") {
      courierId = null;
      trackingNumber = null;
    } else if (status === "outForDelivery") {
      if (Math.random() < 0.6) {
        courierId = rnd([bosta, shipblu])._id;
        trackingNumber = courierId.equals(bosta._id) ? `46969${rndInt(10000, 99999)}` : `${rndInt(3000000, 3999999)}`;
      } else {
        courierId = rnd(turuqCouriers)._id;
        trackingNumber = null;
      }
    } else if (["pickedUp", "processing", "postponed"].includes(status)) {
      courierId = rnd(turuqCouriers)._id;
      trackingNumber = null;
    } else if (["delivered", "collected", "returned", "RTW", "RTO"].includes(status)) {
      if (Math.random() < 0.5) {
        courierId = rnd([bosta, shipblu])._id;
        trackingNumber = courierId.equals(bosta._id) ? `46969${rndInt(10000, 99999)}` : `${rndInt(3000000, 3999999)}`;
      } else {
        courierId = rnd(turuqCouriers)._id;
        trackingNumber = null;
      }
    } else if (status === "cancelled") {
      if (cancelledReachedPickup || history["pickedUp"]) {
        if (Math.random() < 0.5) {
          courierId = rnd([bosta, shipblu])._id;
          trackingNumber = courierId.equals(bosta._id) ? `46969${rndInt(10000, 99999)}` : `${rndInt(3000000, 3999999)}`;
        } else {
          courierId = rnd(turuqCouriers)._id;
          trackingNumber = null;
        }
      } else {
        courierId = null;
        trackingNumber = null;
      }
    }

    let shippingHandledBy = "CUSTOMER";
    if (Math.random() < 0.06) shippingHandledBy = "TURUQ";
    else if (Math.random() < 0.15) shippingHandledBy = "BRAND";
    const subtotal = rndInt(1, 5) * 100 + rndInt(0, 50);
    const gov = (customer.gov || "").toUpperCase();
    const defaultFee = defaultShippingFee(gov);
    let shippingFees = shippingHandledBy === "TURUQ" ? 0 : defaultFee;
    const total = shippingHandledBy === "CUSTOMER" ? subtotal + shippingFees : subtotal;

    const address = rnd(customer.addresses);
    const phoneNorm = customer.normalized;

    const brandProducts = products.filter((p: any) => String(p.primaryClientId) === String(client._id));
    const numProds = rndInt(1, 3);
    const orderProducts = [];
    for (let p = 0; p < numProds; p++) {
      const pr = rnd(brandProducts.length ? brandProducts : products);
      orderProducts.push({ uid: pr.uid, name: pr.itemDescription, variant: `${pr.color}/${pr.size}`, quantity: rndInt(1, 3), price: pr.unitPrice });
    }

    let specialHandling = "none";
    if (Math.random() < 0.08) specialHandling = rnd(["urgent", "vip", "replacement"]);

    const addrValid = isAddressValid(address);
    const phoneValid = isValidPhone(phoneNorm);

    const orderDoc: any = {
      oid: model2 === "turuq" ? oid("TQ", i) : oid("SH", i),
      clientId: client._id,
      status,
      statusHistory: history,
      lastStatusChangedAt: lastChanged,
      customerPhone: customer.phone,
      customerPhoneNormalized: phoneNorm,
      customerAddress: address,
      customerGovernorate: gov,
      products: orderProducts,
      subtotal,
      total,
      shippingFees,
      shippingHandledBy,
      paymentMethod: rnd(["CASH", "INSTAPAY", "VISA", "FLASH"]),
      paymentStatus: Math.random() < 0.4 ? "PAID" : "UNPAID",
      canOpenPackage: Math.random() < 0.3,
      notes: Math.random() < 0.2 ? "Handle with care" : "",
      courierId,
      courierNotes: "",
      deliveryAttempts: status === "cancelled" ? rndInt(0, 2) : 0,
      deliveryAttemptTimestamps: {},
      trackingNumber,
      currentLocation: location,
      specialHandling,
      hasOpenIssue: false,
      issueFlags: [],
      cancellationReason: null,
      cancelledBy: null,
      cancellationImages: [],
      cancellationReviewStatus: "NONE",
      dropoffBatchId: null,
      tripBatchId: null,
      createdByStaffId: null,
    };

    if (model2 === "turuq") {
      orderDoc.customerName = customer.name + (Math.random() < 0.1 ? " (alt spelling)" : "");
      orderDoc.type = orderType;
      orderDoc.courierAssignedAt = courierId ? daysAgo(rndInt(1, 10)) : null;
    } else {
      const parts = customer.name.split(" ");
      orderDoc.customerFirstName = parts[0];
      orderDoc.customerLastName = parts.slice(1).join(" ");
      orderDoc.provider = rnd(["SHOPIFY", "WOOCOMMERCE", "OPENAPI"]);
      orderDoc.externalId = `ext-${i}`;
    }

    if (status === "cancelled") {
      const reason = rnd(cancellationReasonsSeed);
      orderDoc.cancellationReason = reason.code;
      orderDoc.cancelledBy = Math.random() < 0.7 ? "SUPPORT" : rnd(["BRAND", "COURIER", "SYSTEM"]);
      if (reason.requiresAttachment) {
        orderDoc.cancellationImages = [`/uploads/evidence-${i}.jpg`];
        orderDoc.cancellationReviewStatus = Math.random() < 0.6 ? "PENDING" : "APPROVED";
      } else {
        orderDoc.cancellationImages = [];
        orderDoc.cancellationReviewStatus = "NONE";
      }
      if (orderDoc.cancellationReviewStatus === "APPROVED") {
        orderDoc.cancellationReviewedBy = staff[0].name;
        orderDoc.cancellationReviewedAt = daysAgo(rndInt(0, 5));
        orderDoc.cancellationReviewNote = "Approved";
      }
      if (Math.random() < 0.5) {
        const h: Record<string, string> = { pending: history["pending"] };
        if (history["pickedUp"] && Math.random() < 0.6) h["pickedUp"] = history["pickedUp"];
        if (history["processing"] && Math.random() < 0.7) h["processing"] = history["processing"];
        h["cancelled"] = history["cancelled"] || baseDate.toISOString();
        orderDoc.statusHistory = h;
        orderDoc.lastStatusChangedAt = new Date(h["cancelled"]);
        if (h["processing"]) orderDoc.currentLocation = "distribution_center";
        else if (h["pickedUp"]) orderDoc.currentLocation = "with_courier";
        else orderDoc.currentLocation = serviceScheme === "WAREHOUSE" ? "warehouse" : "brand_storage";
      }
    }

    const Model = model2 === "turuq" ? TuruqOrder : IntegrationOrder;
    const created = await Model.create(orderDoc);
    ordersCreated.push({ model: model2, id: created._id, status });

    const flagsToCreate: any[] = [];
    if (!addrValid) flagsToCreate.push({ type: "invalid_address", note: "Auto: invalid address", reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
    if (!phoneValid) flagsToCreate.push({ type: "invalid_phone_number", note: "Auto: invalid phone", reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });

    if (Math.random() < 0.12 && flagsToCreate.length === 0) {
      const types = ["ticket", "return_missing_items", "return_wrong_items", "delayed_shipment", "defective_items", "other"];
      const reporters: any[] = ["brand", "warehouse", "distribution_center", "support"];
      flagsToCreate.push({
        type: rnd(types),
        note: "Seeded flag",
        reportedByRole: rnd(reporters),
        reportedByUser: rnd(reporters),
        reportedAt: daysAgo(rndInt(0, 10)),
        state: "open",
      });
    }

    if (flagsToCreate.length) {
      created.issueFlags = flagsToCreate as any;
      created.hasOpenIssue = flagsToCreate.some((f) => f.state === "open");
      await created.save();
      const fresh = await Model.findById(created._id);
      for (const f of fresh.issueFlags) {
        if (f.state === "open") {
          await Alert.create({ type: "NEW_FLAG", orderModel: model2, orderId: created._id, flagId: f._id, createdAt: f.reportedAt, handled: Math.random() < 0.3 });
        }
      }
    }

    if (makeStale) staleCandidates.push({ model: model2, id: created._id });
  }

  console.log("orders created", ordersCreated.length);

  // Resolved flags
  let resolvedCount = 0;
  for (const m of ["turuq", "integration"]) {
    const Model = m === "turuq" ? TuruqOrder : IntegrationOrder;
    const docs = await Model.find({ "issueFlags.0": { $exists: true } }).limit(4);
    for (const d of docs) {
      if (d.issueFlags.length > 0 && Math.random() < 0.4 && resolvedCount < 4) {
        const f = d.issueFlags[0];
        f.state = "resolved";
        f.resolvedBy = staff[0].name;
        f.resolvedAt = new Date();
        f.resolveNote = "Resolved in seed";
        d.hasOpenIssue = d.issueFlags.some((x: any) => x.state === "open");
        await d.save();
        resolvedCount++;
      }
    }
  }

  // Dropoff batches
  const courierForBlock = turuqCouriers[0];
  const oldDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  for (let i = 0; i < 3; i++) {
    await DropoffBatch.create({
      bid: `DB-BLOCK-${i}`,
      courierId: courierForBlock._id,
      destinationType: "BRAND",
      clientId: clientDocs[i % clientDocs.length]._id,
      startDate: oldDate,
      status: "OPEN",
      otp: `${100000 + i}`,
      ordersCount: rndInt(1, 5),
    });
  }
  await DropoffBatch.create({
    bid: "DB-OLD-1",
    courierId: turuqCouriers[1]._id,
    destinationType: "WAREHOUSE",
    clientId: null,
    startDate: oldDate,
    status: "OPEN",
    otp: "654321",
    ordersCount: 2,
  });
  for (let i = 0; i < 4; i++) {
    await DropoffBatch.create({
      bid: `DB-CLOSED-${i}`,
      courierId: rnd(turuqCouriers)._id,
      destinationType: rnd(["BRAND", "WAREHOUSE"]) as any,
      clientId: clientDocs[i % clientDocs.length]._id,
      startDate: daysAgo(rndInt(10, 20)),
      endDate: daysAgo(rndInt(1, 5)),
      status: "CLOSED",
      otp: `${200000 + i}`,
      ordersCount: rndInt(1, 8),
      finishedBy: staff[0].name,
    });
  }
  for (let i = 0; i < 4; i++) {
    await TripBatch.create({
      bid: `TB-${i}`,
      courierId: rnd(turuqCouriers)._id,
      startDate: daysAgo(rndInt(1, 10)),
      endDate: Math.random() < 0.5 ? daysAgo(rndInt(0, 3)) : null,
      ordersCount: rndInt(2, 12),
    });
  }
  console.log("batches done");

  // Support notes
  for (const s of staff) {
    for (let i = 0; i < rndInt(2, 3); i++) {
      await SupportNote.create({ staffId: s._id, text: `Private note ${i + 1} for ${s.name}`, done: Math.random() < 0.3, doneAt: null });
    }
  }

  // Brand email outbox
  for (let i = 0; i < 5; i++) {
    await BrandEmailOutbox.create({
      clientId: clientDocs[i % clientDocs.length]._id,
      toEmail: clientDocs[i % clientDocs.length].email,
      subject: `Order update ${i}`,
      body: `Fields changed for order TQ-${100000 + i}`,
      createdAt: daysAgo(rndInt(0, 10)),
    });
  }

  console.log("SEED COMPLETE");
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
