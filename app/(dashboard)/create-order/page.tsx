"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { computeTotal } from "@/lib/rules/shipping";
import { defaultShippingFee, GOVERNORATE_DEFAULT_SHIPPING } from "@/lib/rules/constants";
import {
  Plus,
  CheckCircle,
  Building2,
  User,
  Package,
  CreditCard,
  Receipt,
  Trash2,
  Verified,
  MapPin,
  Phone,
  Boxes,
  X,
} from "lucide-react";

function CreateOrderContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const from = sp.get("from");
  const mode = sp.get("mode") || "same";

  const { data: clientsData } = useQuery({ queryKey: ["clients"], queryFn: async () => (await fetch("/api/clients")).json() });
  const clients = clientsData?.items || [];

  const isEdit = mode === "edit";

  const [source, setSource] = useState<"turuq" | "integration">("turuq");
  const [clientId, setClientId] = useState("");
  const [orderType, setOrderType] = useState("NORMAL");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGovernorate, setCustomerGovernorate] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [shippingHandledBy, setShippingHandledBy] = useState("CUSTOMER");
  const [canOpenPackage, setCanOpenPackage] = useState(false);
  const [specialHandling, setSpecialHandling] = useState("none");
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<{ uid: string; name: string; variant: string; quantity: number; price: number }[]>([]);
  const [totalInput, setTotalInput] = useState("0");
  const [totalEdited, setTotalEdited] = useState(false);

  const [selectedProductUid, setSelectedProductUid] = useState("");
  const [productQty, setProductQty] = useState(1);
  const [productPrice, setProductPrice] = useState(0);

  const { data: brandProducts } = useQuery({
    queryKey: ["products", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/products?clientId=${clientId}`);
      if (!res.ok) return { items: [] };
      return res.json();
    },
    enabled: !!clientId,
  });
  const availProducts = brandProducts?.items || [];

  const { data: custLookup } = useQuery({
    queryKey: ["custlookup", customerPhone],
    queryFn: async () => (await fetch(`/api/lookup/customer?phone=${encodeURIComponent(customerPhone)}`)).json(),
    enabled: customerPhone.length >= 8,
  });
  const verifiedList = custLookup?.addressList || [];

  useEffect(() => {
    if (!from) return;
    const [m, id] = from.split("/");
    fetch(`/api/orders/${m}/${id}`).then((r) => r.json()).then((d) => {
      const o = d.order;
      if (!o) return;
      setSource(m === "integration" ? "integration" : "turuq");
      setClientId(String(o.clientId?._id || o.clientId));
      if (m === "turuq") setCustomerName(o.customerName || "");
      else setCustomerName(`${o.customerFirstName || ""} ${o.customerLastName || ""}`.trim());
      setCustomerPhone(o.customerPhone || "");
      setCustomerGovernorate(o.customerGovernorate || "");
      setCustomerAddress(o.customerAddress || "");
      setPaymentMethod(o.paymentMethod || "CASH");
      setPaymentStatus(o.paymentStatus || "UNPAID");
      setShippingHandledBy(o.shippingHandledBy || "CUSTOMER");
      setCanOpenPackage(!!o.canOpenPackage);
      setNotes(o.notes || "");
      setSpecialHandling(o.specialHandling || "none");
      if (mode === "same" || mode === "edit") {
        setProducts((o.products || []).map((p: any) => ({ uid: p.uid, name: p.name, variant: p.variant, quantity: p.quantity, price: p.price })));
      } else if (mode === "exchange") {
        setProducts([]);
      }
      const loadedProducts = (o.products || []).map((p: any) => ({ uid: p.uid, name: p.name, variant: p.variant, quantity: p.quantity, price: p.price }));
      const loadedSubtotal = loadedProducts.reduce((s: number, p: any) => s + p.price * p.quantity, 0);
      const loadedHandler = (o.shippingHandledBy || "CUSTOMER");
      const loadedShipping = loadedHandler === "TURUQ" ? 0 : (o.shippingFees ?? defaultShippingFee(o.customerGovernorate || ""));
      const loadedTotal = (o.paymentStatus || "UNPAID") === "PAID" ? 0 : computeTotal(loadedSubtotal, loadedShipping, loadedHandler);
      setTotalInput(String(loadedTotal));
      setTotalEdited(false);
    });
  }, [from, mode]);

  const subtotal = useMemo(() => products.reduce((s, p) => s + p.price * p.quantity, 0), [products]);
  const shippingFees = useMemo(() => {
    if (shippingHandledBy === "TURUQ") return 0;
    return defaultShippingFee(customerGovernorate);
  }, [shippingHandledBy, customerGovernorate]);
  const computedTotal = useMemo(() => (paymentStatus === "PAID" ? 0 : computeTotal(subtotal, shippingFees, shippingHandledBy)), [subtotal, shippingFees, shippingHandledBy, paymentStatus]);
  const total = isEdit ? (totalInput === "" ? 0 : Number(totalInput)) : computedTotal;

  useEffect(() => {
    if (!isEdit) return;
    if (!totalEdited) {
      setTotalInput(String(computedTotal));
    }
  }, [computedTotal, isEdit, totalEdited]);

  function addProduct() {
    const pr = availProducts.find((p: any) => p.uid === selectedProductUid);
    if (!pr) return;
    setProducts((prev) => [...prev, { uid: pr.uid, name: pr.itemDescription, variant: `${pr.color}/${pr.size}`, quantity: productQty, price: productPrice || pr.unitPrice }]);
    setSelectedProductUid("");
    setProductQty(1);
    setProductPrice(0);
  }

  function removeProduct(i: number) {
    setProducts((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateProductQty(i: number, qty: number) {
    setProducts((prev) => prev.map((p, idx) => idx === i ? { ...p, quantity: Math.max(1, qty) } : p));
  }

  function updateProductPrice(i: number, price: number) {
    setProducts((prev) => prev.map((p, idx) => idx === i ? { ...p, price: Math.max(0, price) } : p));
  }

  function clearForm() {
    setSource("turuq");
    setClientId("");
    setOrderType("NORMAL");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerGovernorate("");
    setCustomerAddress("");
    setPaymentMethod("CASH");
    setPaymentStatus("UNPAID");
    setShippingHandledBy("CUSTOMER");
    setCanOpenPackage(false);
    setSpecialHandling("none");
    setNotes("");
    setProducts([]);
    setSelectedProductUid("");
    setProductQty(1);
    setProductPrice(0);
  }

  async function submit() {
    if (isEdit && from) {
      const [editModel, editId] = from.split("/");
      const body: any = {
        customerPhone,
        customerGovernorate,
        customerAddress,
        products,
        paymentMethod,
        paymentStatus,
        shippingHandledBy,
        notes,
        subtotal,
        shippingFees,
        total,
        specialHandling,
      };
      if (editModel === "turuq") body.customerName = customerName;
      else {
        const parts = customerName.split(" ");
        body.customerFirstName = parts[0] || "";
        body.customerLastName = parts.slice(1).join(" ") || "";
      }
      const res = await fetch(`/api/orders/${editModel}/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error("Update failed", { description: data.error }); return; }
      toast.success("Order updated");
      router.push(`/orders/${editModel}/${editId}`);
      return;
    }
    const body = {
      clientId,
      customerName,
      customerPhone,
      customerGovernorate,
      customerAddress,
      products,
      paymentMethod,
      paymentStatus,
      shippingHandledBy,
      canOpenPackage,
      notes,
      subtotal,
      shippingFees,
      total,
      type: orderType,
      source,
      specialHandling: from ? "replacement" : specialHandling,
    };
    const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { toast.error("Failed", { description: data.error }); return; }
    toast.success("Order created", { description: data.oid });
    router.push(`/orders/${source}/${data.id}`);
  }

  const selectedClient = clients.find((c: any) => c.id === clientId);

  const SectionHeader = ({ icon: Icon, title, badge }: any) => (
    <div className="bg-primary text-white px-5 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-secondary" />
        <h2 className="text-xs font-black uppercase tracking-widest">{title}</h2>
      </div>
      {badge}
    </div>
  );

  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[10px] font-black uppercase tracking-widest text-primary/80 block mb-1.5">{children}</label>
  );

  const StyledSelect = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      {/* Page actions */}
      <div className="px-6 py-4 border-2 border-primary bg-white rounded-2xl flex items-center justify-end gap-3">
        {!isEdit && (
          <Button
            onClick={clearForm}
            variant="outline"
            className="px-4 py-2 rounded-xl border-surface-200 bg-surface-50 hover:bg-surface-100 text-primary text-xs font-black uppercase tracking-wider transition-colors"
          >
            CLEAR FORM
          </Button>
        )}
        <Button
          onClick={submit}
          disabled={!clientId || !customerPhone || products.length === 0}
          className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all"
        >
          <CheckCircle className="w-4 h-4 text-secondary" />
          <span>{isEdit ? "UPDATE ORDER" : "CREATE ORDER"}</span>
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Brand */}
          <section className={`border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm ${isEdit ? "opacity-70" : ""}`}>
            <SectionHeader icon={Building2} title="Brand" />
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel>SELECT BRAND</FieldLabel>
                <div className="relative">
                  <select
                    value={clientId}
                    disabled={isEdit}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full appearance-none bg-white border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <option value="">Select brand</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <FieldLabel>SOURCE</FieldLabel>
                <select
                  value={source}
                  disabled={isEdit}
                  onChange={(e) => setSource(e.target.value as any)}
                  className="w-full appearance-none bg-white border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {["turuq", "integration"].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {source === "turuq" && (
                <div>
                  <FieldLabel>ORDER TYPE</FieldLabel>
                  <select
                    value={orderType}
                    disabled={isEdit}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="w-full appearance-none bg-white border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {["NORMAL", "EXCHANGE", "REFUND", "PROMOTIONAL"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Customer */}
          <section className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
            <SectionHeader icon={User} title="Customer" />
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>CUSTOMER NAME</FieldLabel>
                  <Input value={customerName} onChange={(e: any) => setCustomerName(e.target.value)} className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-black text-primary focus-visible:ring-primary focus:border-primary focus:bg-white" />
                </div>
                <div>
                  <FieldLabel>PHONE NUMBER</FieldLabel>
                  <Input value={customerPhone} onChange={(e: any) => setCustomerPhone(e.target.value)} className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-black text-primary focus-visible:ring-primary focus:border-primary focus:bg-white mono-num text-primary" />
                </div>
                <div>
                  <FieldLabel>STREET ADDRESS</FieldLabel>
                  <Input value={customerAddress} onChange={(e: any) => setCustomerAddress(e.target.value)} className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-black text-primary focus-visible:ring-primary focus:border-primary focus:bg-white" />
                </div>
                <div>
                  <FieldLabel>GOVERNORATE</FieldLabel>
                  <div className="relative">
                    <select
                      value={customerGovernorate}
                      onChange={(e) => setCustomerGovernorate(e.target.value)}
                      className="w-full appearance-none bg-white border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer"
                    >
                      <option value="">Select governorate</option>
                      {Object.keys(GOVERNORATE_DEFAULT_SHIPPING).map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                      <option value="OTHER">OTHER (DEFAULT FEE)</option>
                    </select>
                  </div>
                </div>
              </div>
              {verifiedList.length > 0 && (
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-2.5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <Verified className="w-4 h-4 text-thumbnail" />
                    <span>VERIFIED ADDRESS SUGGESTIONS (CLICK TO APPLY):</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {verifiedList
                      .sort((a: any, b: any) => (a.governorate === customerGovernorate ? -1 : 1))
                      .map((v: any, i: number) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { setCustomerAddress(v.address); if (v.governorate) setCustomerGovernorate(v.governorate); }}
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wide transition-colors ${
                            v.governorate === customerGovernorate
                              ? "border-primary bg-white hover:bg-primary hover:text-white text-primary"
                              : "border-surface-200 bg-white hover:border-primary text-primary"
                          }`}
                        >
                          {v.address}{v.governorate ? `, ${v.governorate}` : ""}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Products */}
          <section className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
            <SectionHeader
              icon={Package}
              title="Products"
              badge={<span className="px-2.5 py-0.5 rounded bg-white text-primary text-[10px] font-black uppercase mono-num">{products.length} ITEMS</span>}
            />
            <div className="p-5 space-y-4">
              <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200 grid grid-cols-12 gap-2.5 items-end">
                <div className="col-span-12 md:col-span-6">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/80 block mb-1">SELECT BRAND PRODUCT</label>
                  <div className="relative">
                    <select
                      value={selectedProductUid}
                      onChange={(e) => {
                        const uid = e.target.value;
                        setSelectedProductUid(uid);
                        const pr = availProducts.find((p: any) => p.uid === uid);
                        if (pr) setProductPrice(pr.unitPrice);
                      }}
                      className="w-full appearance-none bg-white border-2 border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider pl-4 pr-10 py-2.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer"
                    >
                      <option value="">Select product</option>
                      {availProducts.map((p: any) => (
                        <option key={p.uid} value={p.uid}>{p.itemDescription} ({p.color}/{p.size})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-span-4 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/80 block mb-1">QTY</label>
                  <Input
                    type="number"
                    min={1}
                    value={productQty}
                    onChange={(e) => setProductQty(parseInt(e.target.value) || 1)}
                    className="w-full px-2.5 py-2 bg-white border border-surface-200 rounded-xl text-xs font-black mono-num text-primary text-center focus-visible:ring-primary focus:border-primary"
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/80 block mb-1">PRICE</label>
                  <Input
                    type="number"
                    min={0}
                    value={productPrice}
                    onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-white border border-surface-200 rounded-xl text-xs font-black mono-num text-primary text-center focus-visible:ring-primary focus:border-primary"
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Button
                    onClick={addProduct}
                    disabled={!selectedProductUid}
                    className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4 text-secondary" />
                    <span>ADD</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5">
                {products.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-surface-50 border border-surface-200 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black uppercase text-primary-950 truncate">{p.name}</div>
                      <div className="text-[11px] font-extrabold uppercase text-primary/75 mt-0.5 mono-num">{p.variant}</div>
                    </div>
                    {isEdit ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={p.quantity}
                          onChange={(e) => updateProductQty(i, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1.5 bg-white border border-surface-200 rounded-xl text-xs font-black mono-num text-primary text-center"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={p.price}
                          onChange={(e) => updateProductPrice(i, parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1.5 bg-white border border-surface-200 rounded-xl text-xs font-black mono-num text-primary text-center"
                        />
                        <span className="text-sm font-black mono-num text-primary w-16 text-right">{p.price * p.quantity}</span>
                        <button
                          type="button"
                          onClick={() => removeProduct(i)}
                          className="text-rose-700 hover:text-rose-900 p-1"
                          aria-label="Remove product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black mono-num text-primary">{p.price * p.quantity}</span>
                        <button
                          type="button"
                          onClick={() => removeProduct(i)}
                          className="text-rose-700 hover:text-rose-900 p-1"
                          aria-label="Remove product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Payment & Shipping */}
          <section className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
            <SectionHeader icon={CreditCard} title="Payment & Shipping" />
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>PAYMENT METHOD</FieldLabel>
                  <StyledSelect value={paymentMethod} onChange={setPaymentMethod} options={["CASH", "INSTAPAY", "VISA", "FLASH"]} />
                </div>
                <div>
                  <FieldLabel>PAYMENT STATUS</FieldLabel>
                  <StyledSelect value={paymentStatus} onChange={setPaymentStatus} options={["UNPAID", "PAID"]} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>SHIPPING HANDLER</FieldLabel>
                  <StyledSelect value={shippingHandledBy} onChange={setShippingHandledBy} options={["CUSTOMER", "BRAND", "TURUQ"]} />
                </div>
                <div>
                  <FieldLabel>SHIPPING FEE</FieldLabel>
                  <Input
                    type="number"
                    value={shippingFees}
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-black mono-num text-primary focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>
              <label className={`flex items-center justify-between p-3.5 rounded-xl bg-surface-50 border border-surface-200 transition-colors ${isEdit ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-primary/50"}`}>
                <div>
                  <span className="text-xs font-black uppercase text-primary-950 block">CAN OPEN PACKAGE</span>
                  <span className="text-[10px] font-bold uppercase text-primary/70">ALLOW CUSTOMER INSPECTION ON DELIVERY</span>
                </div>
                <input
                  type="checkbox"
                  checked={canOpenPackage}
                  disabled={isEdit}
                  onChange={(e) => setCanOpenPackage(e.target.checked)}
                  className="w-5 h-5 rounded accent-primary cursor-pointer disabled:cursor-not-allowed"
                />
              </label>
              <div>
                <FieldLabel>SPECIAL HANDLING</FieldLabel>
                <StyledSelect value={specialHandling} onChange={setSpecialHandling} options={["none", "VIP", "replacement", "urgent"]} />
              </div>
              <div>
                <FieldLabel>NOTE</FieldLabel>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add delivery instructions or order notes..."
                  className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-semibold placeholder:text-primary/50 text-primary focus-visible:ring-primary focus:border-primary focus:bg-white resize-y"
                />
              </div>
            </div>
          </section>

          {/* Totals */}
          {isEdit ? (
            <section className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-xl">
              <SectionHeader icon={Receipt} title="Totals" />
              <div className="p-5 space-y-3.5">
                <div>
                  <FieldLabel>SUBTOTAL</FieldLabel>
                  <div className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-black mono-num text-primary flex items-center justify-between">
                    <span>{subtotal}</span>
                  </div>
                </div>
                <div>
                  <FieldLabel>SHIPPING</FieldLabel>
                  <div className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-black mono-num text-primary flex items-center justify-between">
                    <span>{shippingFees}</span>
                  </div>
                </div>
                <div className="pt-3 border-t-2 border-primary">
                  <FieldLabel>TOTAL (+ / -)</FieldLabel>
                  <Input
                    type="number"
                    value={totalInput}
                    onChange={(e) => { setTotalInput(e.target.value); setTotalEdited(true); }}
                    className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm font-black mono-num text-primary focus-visible:ring-primary focus:border-primary"
                  />
                </div>
                <Button
                  onClick={submit}
                  disabled={!customerPhone || products.length === 0}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <CheckCircle className="w-4 h-4 text-secondary" />
                  <span>UPDATE ORDER</span>
                </Button>
              </div>
            </section>
          ) : (
            <section className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-xl">
              <SectionHeader icon={Receipt} title="Totals" />
              <div className="p-5 space-y-3.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-primary/85">
                  <span>SUBTOTAL</span>
                  <span className="font-black mono-num text-primary-950">{subtotal}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold uppercase text-primary/85">
                  <span>SHIPPING</span>
                  <span className="font-black mono-num text-primary-950">{shippingFees}</span>
                </div>
                <div className="pt-3.5 border-t-2 border-primary flex items-center justify-between">
                  <span className="text-sm font-black uppercase tracking-wider text-primary">TOTAL</span>
                  <span className="text-2xl font-black mono-num text-primary">{total}</span>
                </div>
                <Button
                  onClick={submit}
                  disabled={!clientId || !customerPhone || products.length === 0}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4 text-secondary" />
                  <span>SUBMIT & CREATE ORDER</span>
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateOrderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateOrderContent />
    </Suspense>
  );
}
