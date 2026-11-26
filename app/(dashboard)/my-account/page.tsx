"use client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Shield, CheckCircle2, XCircle } from "lucide-react";

export default function MyAccountPage() {
  const { t } = useLanguage();
  const { data } = useQuery({ queryKey: ["me"], queryFn: async () => (await fetch("/api/me")).json() });
  return (
    <div className="p-8 space-y-6">
      <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
        <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
          <User className="w-5 h-5 text-secondary" />
          <h2 className="text-xs font-black uppercase tracking-widest">{t("myAccount.profile")}</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">{t("myAccount.name")}</span>
            <span className="text-sm font-black uppercase text-primary-950 mt-1 block">{data?.name || "—"}</span>
          </div>
          <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">{t("myAccount.username")}</span>
            <span className="text-sm font-black uppercase text-primary-950 mt-1 block">{data?.username || "—"}</span>
          </div>
          <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">{t("myAccount.email")}</span>
            <span className="text-sm font-black uppercase text-primary-950 mt-1 block">{data?.email || "—"}</span>
          </div>
          <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">{t("myAccount.phone")}</span>
            <span className="text-sm font-black uppercase text-primary-950 mono-num mt-1 block">{data?.phone || "—"}</span>
          </div>
          <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/75 block">{t("myAccount.role")}</span>
            <span className="text-sm font-black uppercase text-primary mt-1 block">{data?.role || "—"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-2 border-primary rounded-2xl bg-white overflow-hidden shadow-sm">
          <div className="bg-primary text-white px-5 py-3.5 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-secondary" />
            <h2 className="text-xs font-black uppercase tracking-widest">{t("myAccount.canDo")}</h2>
          </div>
          <div className="p-5 space-y-2 text-xs font-bold uppercase text-primary-950 leading-relaxed">
            <div>Search and view orders from both sources</div>
            <div>Use quick order lookup</div>
            <div>See carrier, courier and tracking details</div>
            <div>Open carrier tracking links</div>
            <div>View stale-orders page and take action</div>
            <div>Add and resolve issue flags</div>
            <div>Set special handling</div>
            <div>Create orders and replacement/exchange orders</div>
            <div>Edit orders within the edit rules</div>
            <div>Cancel orders with a reason and evidence</div>
            <div>Review cancellation evidence</div>
            <div>Look up customers by phone</div>
            <div>View client performance graphs</div>
            <div>View dropoff batches</div>
            <div>Keep private notes</div>
          </div>
        </div>

        <div className="border-2 border-accent rounded-2xl bg-white overflow-hidden shadow-sm">
          <div className="bg-sidebar-accent-foreground text-white px-5 py-3.5 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-secondary" />
            <h2 className="text-xs font-black text-white uppercase tracking-widest">{t("myAccount.cannotDo")}</h2>
          </div>
          <div className="p-5 space-y-2 text-xs font-bold uppercase text-primary-950 leading-relaxed">
            <div>Delete orders</div>
            <div>Edit orders outside the edit rules</div>
            <div>Change an order's status freely</div>
            <div>Manage staff</div>
            <div>See the brand-side OTP screen (except via simulator)</div>
            <div>See products management (no products page for Support)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
