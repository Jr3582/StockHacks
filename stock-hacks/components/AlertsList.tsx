"use client";

import React, { useEffect, useState } from "react";
import AlertCard from "@/components/AlertCard";

export default function AlertsList() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts', { cache: 'no-store' });
      const data = await res.json();
      if (data?.alerts) setAlerts(data.alerts as any[]);
    } catch (err) {
      console.error('fetch alerts error', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts();
    const onCreated = () => fetchAlerts();
    window.addEventListener('alert:created', onCreated as EventListener);
    const onDeleted = () => fetchAlerts();
    const onUpdated = () => fetchAlerts();
    window.addEventListener('alert:deleted', onDeleted as EventListener);
    window.addEventListener('alert:updated', onUpdated as EventListener);
    return () => {
      window.removeEventListener('alert:created', onCreated as EventListener);
      window.removeEventListener('alert:deleted', onDeleted as EventListener);
      window.removeEventListener('alert:updated', onUpdated as EventListener);
    };
  }, []);

  if (loading) return <div className="text-gray-400">Loading alerts...</div>;
  if (!alerts || alerts.length === 0) return <div className="text-gray-400">No alerts yet.</div>;

  return (
    <div className="space-y-3">
      {alerts.map((a) => (
        <AlertCard key={String(a._id ?? a.id ?? `${a.symbol}-${Math.random().toString(36).slice(2,8)}`)} alert={{
          id: a._id ? String(a._id) : (a.id ?? `${a.symbol}-${Math.random().toString(36).slice(2,8)}`),
          company: a.company,
          symbol: a.symbol,
          price: a.price ?? 0,
          pctChange: a.pctChange ?? null,
          condition: a.condition,
          frequency: a.frequency,
          logoUrl: a.logoUrl,
          alertName: a.alertName ?? '',
          value: typeof a.value === 'number' ? a.value : (typeof a.value === 'string' && a.value.trim() !== '' ? Number(a.value) : undefined),
        }} pct={a.pctChange ?? null} />
      ))}
    </div>
  );
}
