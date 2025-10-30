"use client"

import React from "react";
import { Button } from "@/components/ui/button";

export default function AddAlertButton({ symbol, company }: { symbol: string; company?: string }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const payload = {
        alertName: `${company ?? symbol} Alert`,
        symbol: symbol,
        username: symbol,
        company: company ?? symbol,
        alertType: 'price',
      } as any;
      window.dispatchEvent(new CustomEvent('alert:edit', { detail: payload }));
    } catch (err) {
      console.error('dispatch alert:edit failed', err);
    }
  };

  return (
    <Button onClick={handleClick} className="add-alert cursor-pointer bg-blue-600 hover:bg-blue-500 text-white">
      Add Alert
    </Button>
  );
}
