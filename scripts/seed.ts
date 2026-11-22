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
import { FINAL_STATUSES, ISSUE_FLAG_TYPES } from "../lib/rules/constants";

const brandNames = [
  "Nile Wear", "Cairo Home", "Glow Cosmetics", "Tech Souk", "Baby Corner",
  "Desert Bloom", "Delta Foods", "Pyramid Electronics", "Red Sea Sports", "Mediterranean Home",
  "Pharma Care", "Auto Parts EG", "Cotton Line", "Kitchen King", "Book Nook",
  "Pet Paradise", "Gardenia", "Sound Wave", "Luxury Leather", "Daily Market",
];

const turuqCourierNames = [
  "Ahmed Hassan", "Mohamed Ali", "Youssef Ibrahim", "Khaled Mahmoud", "Omar Sayed",
  "Hassan Farouk", "Tarek Nabil", "Amr Khaled", "Mostafa Adel", "Karim Samir",
  "Mahmoud Reda", "Sherif Lotfy", "Wael Gamal", "Hany Fawzy", "Bassem Yehia",
  "Nader Magdy", "Ramy Fouad", "Samy Tawfik",
];

const zones = ["Cairo", "Giza", "Alexandria", "Qalyubia", "Sharqia", "Gharbia", "Dakahlia", "Fayoum"];

const customerFirst = [
  "Ahmed", "Mohamed", "Ali", "Omar", "Youssef", "Mahmoud", "Hassan", "Tarek",
  "Fatma", "Mona", "Sara", "Nour", "Yasmin", "Hana", "Laila", "Karim",
  "Khaled", "Amr", "Mostafa", "Ramy", "Sherif", "Wael", "Hany", "Bassem",
  "Nader", "Samy", "Gamal", "Fawzy", "Yehia", "Magdy", "Fouad", "Tawfik",
  "Adel", "Nabil", "Reda", "Lotfy", "Ibrahim", "Sayed", "Farouk", "Khaled",
];
const customerLast = [
  "Hassan", "Ali", "Ibrahim", "Mahmoud", "Ahmed", "Mohamed", "Sayed", "Farouk",
  "Nabil", "Khaled", "Adel", "Fathy", "Reda", "Lotfy", "Gamal", "Fawzy",
  "Yehia", "Magdy", "Fouad", "Tawfik", "Naser", "Ezz", "Hosny", "Salem",
  "Amin", "Badr", "Dawood", "Emam", "Gaber", "Hafez", "Ismail", "Jaber",
];

const governorates = [
  "Cairo", "Giza", "Helwan", "6th of October", "Alexandria", "Suez", "Ismailia", "Fayed",
  "Port Said", "Dakahlia", "Qalyubia", "Menoufia", "Sharkeya", "Gharbeya", "Beheira",
  "Kafr El Sheikh", "Damietta", "Beni Suef", "Minya", "Fayoum", "Asyut", "Sohag", "Qena",
  "Luxor", "Aswan", "Red Sea", "South Sinai", "North Sinai", "New Valley", "Matrouh",
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
  "14 Mansoura Street, Zamalek, Cairo",
  "9 Ahmed Orabi Street, Mohandessin, Giza",
  "31 Cleopatra Street, Alexandria",
  "6 El Horreya Road, Gleem, Alexandria",
  "11 Salah Salem Street, Cairo",
  "25 Tanta Street, Shubra, Cairo",
  "4 Maadi Corniche, Cairo",
  "17 Mostafa Kamel Street, Sidi Gaber, Alexandria",
  "2 El Hegaz Street, Heliopolis, Cairo",
  "13 Dokki Street, Giza",
];
const invalidAddresses = ["شارع معز الدولة", "Moez Street", "New Cairo", "El Tahrir", "شارع النصر"];

const productCatalog = [
  { desc: "T-Shirt", price: 250 },
  { desc: "Jeans", price: 600 },
  { desc: "Sneakers", price: 900 },
  { desc: "Hoodie", price: 450 },
  { desc: "Dress", price: 700 },
  { desc: "Jacket", price: 1200 },
  { desc: "Bag", price: 350 },
  { desc: "Watch", price: 1500 },
  { desc: "Perfume", price: 800 },
  { desc: "Sunglasses", price: 550 },
  { desc: "Backpack", price: 650 },
  { desc: "Wallet", price: 300 },
  { desc: "Belt", price: 200 },
  { desc: "Scarf", price: 180 },
  { desc: "Hat", price: 150 },
  { desc: "Shirt", price: 400 },
  { desc: "Shorts", price: 280 },
  { desc: "Skirt", price: 320 },
  { desc: "Sweater", price: 500 },
  { desc: "Coat", price: 1400 },
];

const colors = ["Black", "White", "Blue", "Red", "Green", "Beige", "Navy", "Gray", "Pink", "Yellow"];
const sizes = ["S", "M", "L", "XL", "XXL", "One Size"];

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uid() { return "uid-" + Math.random().toString(36).slice(2, 10); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(rndInt(8, 20), rndInt(0, 59), 0, 0); return d; }
function oid(prefix: string, n: number) { return `${prefix}-${100000 + n}`; }
function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

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

// Status distribution for 200 orders. Includes every status from the spec.
const statusDistribution: Record<string, number> = {
  delivered: 75,
  collected: 10,
  outForDelivery: 15,
  pending: 14,
  pickedUp: 10,
  processing: 14,
  postponed: 6,
  unreachable: 5,
  invalidAddress: 4,
  outOfStock: 6,
  returned: 10,
  RTW: 6,
  cancelled: 17,
  packed: 3,
  QC: 3,
  droppedOff: 2,
};

const ALL_STATUSES = Object.keys(statusDistribution);

function buildStatusPath(status: string, serviceScheme: string): { path: string[]; location: string | null } {
  const path: string[] = ["pending"];
  let location: string | null = serviceScheme === "WAREHOUSE" ? "warehouse" : "brand_storage";

  if (status === "outOfStock") {
    // Most out-of-stock orders only reach pending + outOfStock
    if (Math.random() < 0.15) {
      path.push("pickedUp", "processing");
    }
    path.push("outOfStock");
    return { path, location };
  }

  if (status !== "pending") {
    path.push("pickedUp");
    location = "with_courier";
  }

  if (["processing", "outForDelivery", "delivered", "collected", "postponed", "unreachable", "invalidAddress", "packed", "droppedOff", "returned", "RTW", "cancelled"].includes(status)) {
    path.push("processing");
    location = "distribution_center";
  }

  if (["packed", "outForDelivery", "delivered", "collected", "postponed", "unreachable", "droppedOff", "returned", "RTW", "cancelled"].includes(status)) {
    path.push("packed");
  }

  if (["outForDelivery", "delivered", "collected", "postponed", "unreachable", "droppedOff", "returned", "RTW", "cancelled"].includes(status)) {
    path.push("outForDelivery");
    location = Math.random() < 0.4 ? "with_carrier" : "with_courier";
  }

  if (status === "droppedOff") {
    path.push("droppedOff");
    return { path, location };
  }

  if (["postponed", "unreachable"].includes(status)) {
    path.push(status);
    location = "distribution_center";
    return { path, location };
  }

  if (status === "invalidAddress") {
    path.push("invalidAddress");
    location = "distribution_center";
    return { path, location };
  }

  if (["delivered", "collected"].includes(status)) {
    path.push(status);
    location = null;
    return { path, location };
  }

  if (status === "QC") {
    if (!path.includes("delivered")) path.push("delivered");
    path.push("QC");
    location = "returns_team";
    return { path, location };
  }

  if (["returned", "RTW"].includes(status)) {
    if (!path.includes("delivered")) path.push("delivered");
    path.push("QC");
    path.push(status);
    location = status === "RTW" ? "warehouse" : "returns_team";
    return { path, location };
  }

  if (status === "cancelled") {
    path.push("cancelled");
    // location keeps the last meaningful location
    if (path.includes("processing")) location = "distribution_center";
    else if (path.includes("pickedUp")) location = "with_courier";
    else location = serviceScheme === "WAREHOUSE" ? "warehouse" : "brand_storage";
    return { path, location };
  }

  return { path, location };
}

function buildHistory(status: string, baseDate: Date, serviceScheme: string): { history: Record<string, string>; lastChanged: Date; location: string | null } {
  const { path, location } = buildStatusPath(status, serviceScheme);
  const dedup: string[] = [];
  for (const s of path) if (dedup[dedup.length - 1] !== s) dedup.push(s);

  const history: Record<string, string> = {};
  const totalSpanHours = rndInt(24, 240);
  const stepHours = totalSpanHours / Math.max(1, dedup.length);
  dedup.forEach((s, idx) => {
    const d = new Date(baseDate.getTime() - (dedup.length - 1 - idx) * stepHours * 60 * 60 * 1000);
    history[s] = d.toISOString();
  });
  const lastChanged = new Date(history[status]);
  return { history, lastChanged, location };
}

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

  // Clients: 20 brands, 10 WAREHOUSE, 10 PICKUP
  const clients = [];
  for (let i = 0; i < brandNames.length; i++) {
    clients.push({
      name: brandNames[i],
      companyName: brandNames[i],
      phone: `010${String(10000000 + i).slice(0, 8)}`,
      email: `${brandNames[i].toLowerCase().replace(/\s+/g, "")}@example.com`,
      serviceScheme: i < 10 ? "WAREHOUSE" : "PICKUP",
      active: true,
    });
  }
  const clientDocs = await Client.insertMany(clients);
  console.log("clients", clientDocs.length);

  // Couriers: Bosta, ShipBlu + 18 Turuq
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

  // Products: ~80 (4 per client)
  const productDocs = [];
  for (const c of clientDocs) {
    const numProducts = rndInt(3, 5);
    for (let i = 0; i < numProducts; i++) {
      const it = rnd(productCatalog);
      productDocs.push({
        uid: uid(),
        itemDescription: `${c.name} ${it.desc}`,
        primaryClientId: c._id,
        quantity: rndInt(10, 200),
        unitPrice: it.price + rndInt(-50, 100),
        size: rnd(sizes),
        color: rnd(colors),
      });
    }
  }
  const products = await Product.insertMany(productDocs);
  console.log("products", products.length);

  // Customers: 50
  interface CustomerT {
    name: string;
    phone: string;
    gov: string;
    addresses: string[];
    normalized: string;
    validPhone: boolean;
  }
  const customers: CustomerT[] = [];
  for (let i = 0; i < 48; i++) {
    const first = rnd(customerFirst);
    const last = rnd(customerLast);
    const phone = `01${rnd(["0", "1", "2", "5"])}${String(10000000 + i * 137).slice(0, 8)}`;
    const gov = rnd(governorates);
    const numAddr = rndInt(1, 3);
    const addresses: string[] = [];
    for (let a = 0; a < numAddr; a++) {
      if (Math.random() < 0.2) addresses.push(rnd(invalidAddresses));
      else addresses.push(`${rndInt(1, 99)} ${rnd(validAddresses)}`);
    }
    customers.push({ name: `${first} ${last}`, phone, gov, addresses, normalized: normalizePhone(phone), validPhone: true });
  }
  customers.push({ name: "Bad Phone One", phone: "12345", gov: "Cairo", addresses: [rnd(validAddresses)], normalized: normalizePhone("12345"), validPhone: false });
  customers.push({ name: "Bad Phone Two", phone: "010123", gov: "Giza", addresses: [rnd(invalidAddresses)], normalized: normalizePhone("010123"), validPhone: false });
  console.log("customers", customers.length);

  // Build status list for 200 orders
  const statusList: string[] = [];
  for (const [s, n] of Object.entries(statusDistribution)) {
    for (let i = 0; i < n; i++) statusList.push(s);
  }
  shuffle(statusList);
  console.log("status count", statusList.length);

  const orderTypes = ["NORMAL", "PROMOTIONAL", "REFUND", "EXCHANGE"];
  const turuqTarget = 130;
  const ordersCreated: { model: string; id: any; status: string; clientId: any }[] = [];
  const staleCandidates: any[] = [];
  let turuqCount = 0;

  for (let i = 0; i < 200; i++) {
    let status = statusList[i];
    const orderType = rnd(orderTypes);

    // REFUND orders follow the refund lifecycle (delivered -> QC -> RTW/RTO)
    if (orderType === "REFUND") {
      status = rnd(["pending", "processing", "outForDelivery", "delivered", "RTW", "RTW"]);
    }

    // Decide source; aim for ~130 Turuq / 70 Integration
    let model2: "turuq" | "integration";
    if (turuqCount < turuqTarget) {
      model2 = "turuq";
    } else {
      model2 = "integration";
    }
    if (model2 === "turuq") turuqCount++;

    const customer = rnd(customers);
    const client = rnd(clientDocs);
    const serviceScheme = client.serviceScheme;

    let baseDate = daysAgo(rndInt(0, 89));
    const isFinal = FINAL_STATUSES.has(status as any);
    const makeStale = !isFinal && Math.random() < 0.15 && staleCandidates.length < 20;
    if (makeStale) baseDate = daysAgo(rndInt(3, 6));

    const { history, lastChanged, location } = buildHistory(status, baseDate, serviceScheme);
    const createdAt = new Date(history["pending"] || baseDate.toISOString());

    // Courier assignment
    let courierId: any = null;
    let trackingNumber: string | null = null;

    const hasBeenWithCourier = ["pickedUp", "processing", "outForDelivery", "droppedOff", "delivered", "collected", "postponed", "unreachable", "invalidAddress", "returned", "RTW", "cancelled"].includes(status);
    const reachedOutForDelivery = history["outForDelivery"] || ["outForDelivery", "droppedOff", "delivered", "collected", "postponed", "unreachable", "returned", "RTW", "cancelled"].includes(status);

    if (hasBeenWithCourier) {
      const useOutsourced = reachedOutForDelivery && Math.random() < 0.45;
      if (useOutsourced) {
        courierId = rnd([bosta, shipblu])._id;
        trackingNumber = courierId.equals(bosta._id) ? `46969${rndInt(10000, 99999)}` : `${rndInt(3000000, 3999999)}`;
      } else {
        courierId = rnd(turuqCouriers)._id;
        trackingNumber = null;
      }
    }

    // Shipping handler
    let shippingHandledBy = "CUSTOMER";
    if (i < 3) {
      shippingHandledBy = "TURUQ";
    } else if (Math.random() < 0.12) {
      shippingHandledBy = "BRAND";
    }

    // Build products for this order
    const brandProducts = products.filter((p: any) => String(p.primaryClientId) === String(client._id));
    const numProds = rndInt(1, 3);
    const orderProducts = [];
    for (let p = 0; p < numProds; p++) {
      const pr = rnd(brandProducts.length ? brandProducts : products);
      orderProducts.push({ uid: pr.uid, name: pr.itemDescription, variant: `${pr.color}/${pr.size}`, quantity: rndInt(1, 3), price: pr.unitPrice });
    }
    const subtotal = orderProducts.reduce((s, p) => s + p.price * p.quantity, 0);
    const gov = (customer.gov || "").toUpperCase();
    let shippingFees = shippingHandledBy === "TURUQ" ? 0 : defaultShippingFee(gov);
    const total = shippingHandledBy === "CUSTOMER" ? subtotal + shippingFees : subtotal;

    const address = rnd(customer.addresses);
    const phoneNorm = customer.normalized;

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
      paymentStatus: Math.random() < 0.35 ? "PAID" : "UNPAID",
      canOpenPackage: Math.random() < 0.3,
      notes: Math.random() < 0.25 ? "Handle with care" : "",
      courierId,
      courierNotes: "",
      deliveryAttempts: ["cancelled", "unreachable", "postponed"].includes(status) ? rndInt(0, 3) : 0,
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
      cancellationReviewedBy: null,
      cancellationReviewedAt: null,
      cancellationReviewNote: null,
      dropoffBatchId: null,
      tripBatchId: null,
      createdByStaffId: null,
      createdAt,
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

    // Cancellation specifics
    if (status === "cancelled") {
      const reason = rnd(cancellationReasonsSeed);
      orderDoc.cancellationReason = reason.code;
      orderDoc.cancelledBy = Math.random() < 0.6 ? "SUPPORT" : rnd(["BRAND", "COURIER", "SYSTEM"]);
      if (reason.requiresAttachment) {
        orderDoc.cancellationImages = [`/uploads/evidence-${i}.jpg`, `/uploads/evidence-${i}-2.jpg`];
        orderDoc.cancellationReviewStatus = Math.random() < 0.7 ? "PENDING" : "APPROVED";
      } else {
        orderDoc.cancellationImages = [];
        orderDoc.cancellationReviewStatus = "NONE";
      }
      if (orderDoc.cancellationReviewStatus === "APPROVED") {
        orderDoc.cancellationReviewedBy = staff[0].name;
        orderDoc.cancellationReviewedAt = daysAgo(rndInt(0, 5));
        orderDoc.cancellationReviewNote = "Approved after review";
      }
      // Cancelled-before-delivery: narrow history to only pending/pickedUp/processing + cancelled
      if (Math.random() < 0.5) {
        const h: Record<string, string> = { pending: history["pending"] };
        if (history["pickedUp"] && Math.random() < 0.55) h["pickedUp"] = history["pickedUp"];
        if (history["processing"] && Math.random() < 0.55) h["processing"] = history["processing"];
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
    ordersCreated.push({ model: model2, id: created._id, status, clientId: client._id });

    if (makeStale) staleCandidates.push({ model: model2, id: created._id });

    // Auto flags + random flags
    const flagsToCreate: any[] = [];
    if (!addrValid) flagsToCreate.push({ type: "invalid_address", note: "Auto: invalid address", reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });
    if (!phoneValid) flagsToCreate.push({ type: "invalid_phone_number", note: "Auto: invalid phone", reportedByRole: "system", reportedByUser: "system", reportedAt: new Date(), state: "open" });

    if (Math.random() < 0.1 && flagsToCreate.length === 0) {
      const types = ISSUE_FLAG_TYPES.filter((t) => t !== "invalid_address" && t !== "invalid_phone_number");
      const reporters: any[] = ["brand", "warehouse", "distribution_center", "support"];
      const reporter = rnd(reporters);
      flagsToCreate.push({
        type: rnd(types),
        note: "Seeded flag",
        reportedByRole: reporter,
        reportedByUser: reporter,
        reportedAt: daysAgo(rndInt(0, 10)),
        state: "open",
      });
    }

    if (flagsToCreate.length) {
      created.issueFlags = flagsToCreate as any;
      created.hasOpenIssue = flagsToCreate.some((f) => f.state === "open");
      await created.save();
      const fresh = await Model.findById(created._id);
      for (const f of fresh!.issueFlags) {
        if (f.state === "open") {
          await Alert.create({ type: "NEW_FLAG", orderModel: model2, orderId: created._id, flagId: f._id, createdAt: f.reportedAt, handled: Math.random() < 0.2 });
        }
      }
    }
  }

  console.log("orders created", ordersCreated.length, "turuq", turuqCount, "integration", 200 - turuqCount);

  // Ensure ~8 cancelled-before-delivery orders by narrowing some cancelled orders
  const cancelledBeforeDeliveryTarget = 8;
  let cbdCount = 0;
  for (const o of ordersCreated.filter((x) => x.status === "cancelled")) {
    if (cbdCount >= cancelledBeforeDeliveryTarget) break;
    const Model = o.model === "turuq" ? TuruqOrder : IntegrationOrder;
    const doc = await Model.findById(o.id);
    if (!doc) continue;
    const h: Record<string, string> = { pending: doc.statusHistory["pending"] || new Date().toISOString() };
    const includePickedUp = Math.random() < 0.5;
    const includeProcessing = !includePickedUp || Math.random() < 0.3;
    if (includePickedUp && doc.statusHistory["pickedUp"]) h["pickedUp"] = doc.statusHistory["pickedUp"];
    if (includeProcessing && doc.statusHistory["processing"]) h["processing"] = doc.statusHistory["processing"];
    h["cancelled"] = doc.statusHistory["cancelled"] || new Date().toISOString();
    doc.statusHistory = h;
    doc.lastStatusChangedAt = new Date(h["cancelled"]);
    if (h["processing"]) doc.currentLocation = "distribution_center";
    else if (h["pickedUp"]) doc.currentLocation = "with_courier";
    else {
      const client = clientDocs.find((c: any) => String(c._id) === String(doc.clientId));
      doc.currentLocation = client?.serviceScheme === "WAREHOUSE" ? "warehouse" : "brand_storage";
    }
    await doc.save();
    cbdCount++;
  }
  console.log("cancelled before delivery ensured", cbdCount);

  // Resolve some flags
  let resolvedCount = 0;
  for (const m of ["turuq", "integration"] as const) {
    const Model = m === "turuq" ? TuruqOrder : IntegrationOrder;
    const docs = await Model.find({ "issueFlags.0": { $exists: true } }).limit(10);
    for (const d of docs) {
      if (resolvedCount >= 8) break;
      if (d.issueFlags.length > 0 && Math.random() < 0.5) {
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
  console.log("resolved flags", resolvedCount);

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

  // Trip batches
  for (let i = 0; i < 6; i++) {
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
    for (let i = 0; i < rndInt(2, 4); i++) {
      await SupportNote.create({
        staffId: s._id,
        text: `Private note ${i + 1} for ${s.name}: ${["call customer back", "check with warehouse", "escalate to admin", "follow up tomorrow"][i % 4]}`,
        done: Math.random() < 0.3,
        doneAt: null,
      });
    }
  }
  console.log("notes done");

  // Brand email outbox
  for (let i = 0; i < 12; i++) {
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
