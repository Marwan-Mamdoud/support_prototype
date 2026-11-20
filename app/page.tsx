"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/orders");
  }, [router]);
  return <div className="min-h-screen flex items-center justify-center text-slate-500">Redirecting...</div>;
}
