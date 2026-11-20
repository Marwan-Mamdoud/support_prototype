"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { computeTotal } from "@/lib/rules/shipping";
import { defaultShippingFee } from "@/lib/rules/constants";

function CreateOrderContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const from = sp.get("from"); // "turuq/id" or "integration/id"
  const mode = sp.get("mode") || "same"; // same | exchange

  const { data: clientsData } = useQuery({ queryKey: ["clients"], queryFn: async () => (await fetch("/api/clients")).json() });
  const clients = clientsData?.items || [];

  const [clientId, setClientId] = useState("");
  const [brandOpen, setBrandOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGovernorate, setCustomerGovernorate] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [shippingHandledBy, setShippingHandledBy] = useState("CUSTOMER");
  const [canOpenPackage, setCanOpenPackage] = useState(false);
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<{ uid: string; name: string; variant: string; quantity: number; price: number }[]>([]);
  const [selectedProductUid, setSelectedProductUid] = useState("");
  const [productQty, setProductQty] = useState(1);
  const [productPrice, setProductPrice] = useState(0);

  const { data: brandProducts } = useQuery({
    queryKey: ["products", clientId],
    queryFn: async () => {
      // products filtered by client via /api/products?clientId=
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

  // Prefill from source order
  useEffect(() => {
    if (!from) return;
    const [m, id] = from.split("/");
    fetch(`/api/orders/${m}/${id}`).then((r) => r.json()).then((d) => {
      const o = d.order;
      if (!o) return;
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
      if (mode === "same") {
        setProducts((o.products || []).map((p: any) => ({ uid: p.uid, name: p.name, variant: p.variant, quantity: p.quantity, price: p.price })));
      } else if (mode === "exchange") {
        // Support picks products with problems; start empty, let them add
        setProducts([]);
      }
    });
  }, [from, mode]);

  const subtotal = useMemo(() => products.reduce((s, p) => s + p.price * p.quantity, 0), [products]);
  const shippingFees = useMemo(() => {
    if (shippingHandledBy === "TURUQ") return 0;
    return defaultShippingFee(customerGovernorate);
  }, [shippingHandledBy, customerGovernorate]);
  const total = useMemo(() => computeTotal(subtotal, shippingFees, shippingHandledBy), [subtotal, shippingFees, shippingHandledBy]);

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

  async function submit() {
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
      type: mode === "exchange" ? "EXCHANGE" : "NORMAL",
      specialHandling: from ? "replacement" : "none",
    };
    const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { toast.error("Failed", { description: data.error }); return; }
    toast.success("Order created", { description: data.oid });
    router.push(`/orders/turuq/${data.id}`);
  }

  const selectedClient = clients.find((c: any) => c.id === clientId);

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold text-primary">Create Order {mode === "exchange" ? "(Exchange)" : ""}</h1>

      <Card>
        <CardHeader><CardTitle>Brand</CardTitle></CardHeader>
        <CardContent>
          <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
            <SelectTrigger><SelectValue placeholder="Select brand..." /></SelectTrigger>
            <SelectContent>
              {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs font-bold">Name</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-bold">Phone</Label>
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-bold">Governorate</Label>
            <Input value={customerGovernorate} onChange={(e) => setCustomerGovernorate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-bold">Address</Label>
            <Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
            {verifiedList.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-slate-500">Verified address suggestions (click to apply):</div>
                {verifiedList
                  .sort((a: any, b: any) => (a.governorate === customerGovernorate ? -1 : 1))
                  .map((v: any) => (
                    <Button key={v.id} size="sm" variant="outline" className="mr-2" onClick={() => { setCustomerAddress(v.address); if (v.governorate) setCustomerGovernorate(v.governorate); }}>
                      {v.address} {v.governorate === customerGovernorate ? "(same gov)" : ""}
                    </Button>
                  ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Products</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs font-bold">Product</Label>
              <Select value={selectedProductUid} onValueChange={(v) => { setSelectedProductUid(v ?? ""); const pr = availProducts.find((p: any) => p.uid === v); if (pr) setProductPrice(pr.unitPrice); }}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {availProducts.map((p: any) => <SelectItem key={p.uid} value={p.uid}>{p.itemDescription} ({p.color}/{p.size})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">Qty</Label>
              <Input type="number" className="w-20" value={productQty} onChange={(e) => setProductQty(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <Label className="text-xs font-bold">Price</Label>
              <Input type="number" className="w-24" value={productPrice} onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)} />
            </div>
            <Button onClick={addProduct}>Add</Button>
          </div>
          <ul className="space-y-1">
            {products.map((p, i) => (
              <li key={i} className="flex items-center justify-between border rounded p-2 text-sm">
                <span>{p.name} {p.variant} × {p.quantity} @ {p.price}</span>
                <Button size="sm" variant="ghost" onClick={() => removeProduct(i)}>Remove</Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment & shipping</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold">Payment method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v ?? "CASH")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["CASH","INSTAPAY","VISA","FLASH"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">Payment status</Label>
              <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v ?? "UNPAID")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["PAID","UNPAID"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-bold">Shipping handled by</Label>
            <Select value={shippingHandledBy} onValueChange={(v) => setShippingHandledBy(v ?? "CUSTOMER")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["CUSTOMER","BRAND","TURUQ"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={canOpenPackage} onChange={(e) => setCanOpenPackage(e.target.checked)} />
            Can open package
          </label>
          <div>
            <Label className="text-xs font-bold">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>Subtotal: {subtotal}</div>
          <div>Shipping: {shippingFees}</div>
          <div className="font-bold">Total: {total}</div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={submit}>Create order</Button>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
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
