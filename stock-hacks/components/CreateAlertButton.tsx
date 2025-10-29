"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import SelectField from "./forms/SelectField";

export default function CreateAlertButton() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { register, control, handleSubmit, reset } = useForm<{
    name?: string;
    username?: string;
    alertType?: string;
    condition?: string;
    frequency?: string;
    value?: number;
  }>({
    defaultValues: {
      name: "Apple Stock Alert",
      username: "AAPL",
      alertType: "price",
      value: 100,
    },
  });

  function onSubmit(values: any) {
    (async () => {
      try {
        const payload = {
          alertName: values.name ?? values.alertName ?? values.title,
          symbol: values.username ?? values.symbol,
          company: values.company ?? values.username ?? values.symbol,
          alertType: values.alertType,
          condition: values.condition,
          frequency: values.frequency,
          value: values.value,
        };
        let res, data;
        if (editingId) {
          res = await fetch(`/api/alerts?id=${encodeURIComponent(editingId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          data = await res.json();
          if (data?.ok) {
            try { window.dispatchEvent(new CustomEvent('alert:updated', { detail: { id: editingId } })); } catch {}
          } else {
            console.error('update alert failed', data);
          }
        } else {
          res = await fetch('/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          data = await res.json();
          if (data?.ok || data?.alert) {
            try { window.dispatchEvent(new CustomEvent('alert:created')); } catch {}
          } else {
            console.error('create alert failed', data);
          }
        }
      } catch (err) {
        console.error('create alert error', err);
      } finally {
        setOpen(false);
        setEditingId(null);
        // reset to defaults so next open is clean
        reset({
          name: undefined,
          username: undefined,
          alertType: 'price',
          condition: undefined,
          frequency: undefined,
          value: undefined,
        });
      }
    })();
  }

  useEffect(() => {
    const onEdit = (e: Event) => {
      try {
        const ev = e as CustomEvent & { detail?: any };
        const a = ev.detail as any;
        if (!a) return;
        // map alert data to form fields
        reset({
          name: a.alertName ?? a.name ?? '',
          username: a.symbol ?? a.username ?? '',
          alertType: a.alertType ?? 'price',
          condition: a.condition ?? undefined,
          frequency: a.frequency ?? undefined,
          value: typeof a.value === 'number' ? a.value : (typeof a.value === 'string' && a.value.trim() !== '' ? Number(a.value) : undefined),
        });
        setEditingId(a.id ?? a._id ?? null);
        setOpen(true);
      } catch (err) {
        console.error('alert:edit handler error', err);
      }
    };
    window.addEventListener('alert:edit', onEdit as EventListener);
    return () => window.removeEventListener('alert:edit', onEdit as EventListener);
  }, [reset]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        onClick={() => setOpen(true)}
        className="flex justify-end bg-yellow-400 text-black hover:bg-yellow-300 shadow-md font-bold"
      >
        Create Alerts
      </Button>

      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="className=space-y-5">
        <DialogHeader>
          <DialogTitle>
            Create Alert
          </DialogTitle>
          <DialogDescription>
            {/* Empty for now - we'll add form fields later */}
          </DialogDescription>
        </DialogHeader>
          <div className="grid gap-7 pt-4">
            <div className="grid gap-1">
              <Label htmlFor="name-1">Alert Name: </Label>
              <Input id="name-1" {...register("name")} defaultValue="AAPL Stock Alert" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="stock-id">Stock Identifier: </Label>
              <Input id="stock-id-1" {...register("username")} defaultValue="AAPL" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="condition-1">Alert Type: </Label>
              <SelectField
                name={"alertType"}
                label={""}
                placeholder={"Select type"}
                options={[{ value: "price", label: "Price" }, { value: "percentage", label: "Percentage" }]}
                control={control}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="condition-1">Condition: </Label>
              <SelectField 
                name={"condition"}
                label={""}
                placeholder={"Select condition"}
                options={[{ value: "greater_than", label: "Greater Than (>)" }, { value: "less_than", label: "Less Than (<)" }, { value: "equal_to", label: "Equal to (=)" }, { value: "less_than_or_equal_to", label: "Less Than or Equal to (≤)" }, { value: "greater_than_or_equal_to", label: "Greater Than or Equal to (≥)" }]}
                control={control}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="value-1" className="grid gap-1">Threshold Value: </Label>
              <Input id="value-1" type="number" step="0.01" {...register('value', { valueAsNumber: true })} defaultValue={100} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="frequency-1">Frequency: </Label>
              <SelectField 
                name={"frequency"}
                label={""}
                placeholder={"Select frequency"}
                options={[{ value: "every_hour", label: "Every Hour" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]}
                control={control}
              />
            </div>
            <div className="grid gap-1">
              <Button type="submit" className="w-full p-3 text-black bg-yellow-400 hover:bg-yellow-300">
                Create Alert
              </Button>
            </div>
          </div>
          <DialogFooter>
            <DialogClose/>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
 
