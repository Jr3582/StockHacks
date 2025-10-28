"use client";

import React, { useEffect, useState } from "react";
import { Edit2, Trash } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

type Alert = {
  id: string;
  company: string;
  symbol: string;
  price: number;
  pctChange?: number | null;
  condition?: string;
  frequency?: string;
  logoUrl?: string;
  alertName: string;
  value?: number;
};

export default function AlertCard({ alert, pct }: { alert: Alert; pct?: number | null }) {
  const [failed, setFailed] = useState(false);
  const [logo, setLogo] = useState<string | null>(alert.logoUrl ?? null);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fmtPct = (v?: number | null) => {
    if (typeof v === 'number') {
      const sign = v > 0 ? '+' : '';
      return `${sign}${v.toFixed(2)}%`;
    }
    return '-';
  }

  const pctClass = (v?: number | null) => {
    if (typeof v === 'number') return v >= 0 ? 'text-xs text-green-400' : 'text-xs text-red-400';
    return 'text-xs text-gray-400';
  }

  useEffect(() => {
    let mounted = true;
    if (!alert.logoUrl) {
      fetch(`/api/logo?symbol=${encodeURIComponent(alert.symbol)}`)
        .then((r) => r.json())
        .then((data) => {
          if (!mounted) return;
          if (data?.logo) setLogo(data.logo as string);
          else setFailed(true);
        })
        .catch(() => {
          if (!mounted) return;
          setFailed(true);
        });
    }
    return () => { mounted = false };
  }, [alert.logoUrl, alert.symbol]);

  return (
    <Card className="w-full">
      <CardHeader className="px-2">
        <div className="flex items-center justify-between gap-2 px-2 w-full">
          <div className="flex items-center gap-3">
            {logo && !failed ? (
              <img
                src={logo}
                alt={`${alert.company} logo`}
                className="h-8 w-8 object-contain rounded-md"
                onError={(e) => {
                  setFailed(true);
                  try { (e.currentTarget as HTMLImageElement).removeAttribute('src') } catch {}
                }}
              />
            ) : (
              <div className="h-8 w-8 rounded-md bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-100">
                {alert.company.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}
              </div>
            )}

            <div>
              <div className="text-sm font-medium text-gray-100">{alert.company}</div>
              <div className="text-xs text-gray-400">${alert.price.toFixed(2)}</div>
            </div>
          </div>

          {/* Right-side: symbol and small metadata, aligned to the far right */}
          <div className="ml-auto flex flex-col items-end text-right">
            <div className="text-sm font-medium text-gray-100">{alert.symbol}</div>
            <div className={pctClass(pct)}>{fmtPct(pct)}</div>
          </div>
        </div>
        <hr className="my-1 mb-1 h-[1px] bg-gray-600" />
        <div className="flex items-center justify-between gap-2 px-2 w-full">
            <div className="flex flex-col gap-y-1">
                <div className="text-sm font-medium text-gray-400">Alert: <span className="text-gray-200 font-bold">{alert.alertName}</span></div>
                <div className="text-sm font-medium text-gray-100">Price{(() => {
                  const c = alert.condition;
                  switch (c) {
                    case 'greater_than': return ' > ';
                    case 'less_than': return ' < ';
                    case 'equal_to': return ' = ';
                    case 'less_than_or_equal_to': return ' ≤ ';
                    case 'greater_than_or_equal_to': return ' ≥ ';
                    default: return c ?? '-';
                  }
                })()}{typeof alert.value === 'number' ? ` $${alert.value.toFixed(2)}` : '-'}</div>
            </div>
        <div className="ml-auto flex flex-col items-end space-y-1">
          <div className="flex items-center gap-2">
            <button
              aria-label="edit"
              className="p-2 rounded-md hover:bg-gray-600"
              onClick={() => {
                try {
                  window.dispatchEvent(new CustomEvent('alert:edit', { detail: alert }));
                } catch (err) {
                  console.error('dispatch alert:edit error', err);
                }
              }}
            >
              <Edit2 className="h-4 w-4 text-gray-300 cursor-pointer" />
            </button>
            <button
              aria-label="delete"
              className={`p-2 rounded-md ${deleting ? 'opacity-60 cursor-wait' : 'hover:bg-red-800'}`}
              onClick={() => { if (!deleting) setShowConfirm(true); }}
            >
              <Trash className="h-4 w-4 text-red-400 cursor-pointer" />
            </button>

          {showConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirm(false)} />
              <div className="relative z-10 w-full max-w-md rounded-md bg-gray-800 p-4 shadow-lg">
                <div className="mb-3 text-sm text-gray-200">Delete alert <span className="font-semibold">{alert.alertName}</span> for <span className="font-mono">{alert.symbol}</span>?</div>
                <div className="flex justify-end gap-2">
                  <button
                    className="rounded px-3 py-1 bg-gray-700 text-sm text-gray-200 hover:bg-gray-600"
                    onClick={() => setShowConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded px-3 py-1 bg-red-600 text-sm text-white hover:bg-red-700"
                    onClick={async () => {
                      if (deleting) return;
                      setDeleting(true);
                      try {
                        const res = await fetch(`/api/alerts?id=${encodeURIComponent(alert.id)}`, { method: 'DELETE' });
                        const data = await res.json();
                        if (res.ok && data?.ok) {
                          try { window.dispatchEvent(new CustomEvent('alert:deleted', { detail: { id: alert.id } })); } catch {}
                        } else {
                          console.error('delete failed', data);
                          try { window.alert('Failed to delete alert.'); } catch {}
                        }
                      } catch (err) {
                        console.error('delete error', err);
                        try { window.alert('Failed to delete alert.'); } catch {}
                      } finally {
                        setDeleting(false);
                        setShowConfirm(false);
                      }
                    }}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
          <div className="text-xs text-yellow-500 bg-yellow-700 rounded-md px-2">Freq: {alert.frequency}</div>
        </div>
      </div>
      </CardHeader>
    </Card>
  );
}
