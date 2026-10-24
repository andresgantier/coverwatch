"use client";

import { createContext, use, type ReactNode } from "react";
import { FormDialog } from "@/components/forms/form-dialog";
import { SelectField, TextAreaField, TextField, type Option } from "@/components/forms/field";
import { EQUIPMENT_TYPES, SEGMENTS, options } from "@/lib/labels";
import type { FormState } from "@/lib/forms";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------
export type CustomerValues = {
  name: string;
  segment: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
};

export function CustomerDialog({
  trigger, title, action, customer,
}: { trigger: ReactNode; title: string; action: Action; customer?: CustomerValues }) {
  return (
    <FormDialog trigger={trigger} title={title} action={action} submitLabel={customer ? "Save" : "Create customer"}>
      {({ errors, value }) => (
        <>
          <TextField label="Name" name="name" defaultValue={value("name", customer?.name)} error={errors.name} />
          <SelectField label="Segment" name="segment" options={options(SEGMENTS)} placeholder="Choose…"
            defaultValue={value("segment", customer?.segment)} error={errors.segment} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Contact person" name="contact_name"
              defaultValue={value("contact_name", customer?.contact_name)} error={errors.contact_name} />
            <TextField label="Phone" name="contact_phone"
              defaultValue={value("contact_phone", customer?.contact_phone)} error={errors.contact_phone} />
          </div>
          <TextField label="Email" name="contact_email" type="email"
            defaultValue={value("contact_email", customer?.contact_email)} error={errors.contact_email} />
          <TextAreaField label="Notes" name="notes" defaultValue={value("notes", customer?.notes)} error={errors.notes} />
        </>
      )}
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Site
// ---------------------------------------------------------------------------
export type SiteValues = {
  name: string;
  street: string;
  postal_code: string;
  city: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
};

export function SiteDialog({
  trigger, title, action, site,
}: { trigger: ReactNode; title: string; action: Action; site?: SiteValues }) {
  return (
    <FormDialog trigger={trigger} title={title} action={action} submitLabel={site ? "Save" : "Add site"}>
      {({ errors, value }) => (
        <>
          <TextField label="Site name" name="name" placeholder="e.g. Head office"
            defaultValue={value("name", site?.name)} error={errors.name} />
          <TextField label="Street and number" name="street" defaultValue={value("street", site?.street)} error={errors.street} />
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <TextField label="Postal code" name="postal_code" inputMode="numeric"
              defaultValue={value("postal_code", site?.postal_code)} error={errors.postal_code} />
            <TextField label="City" name="city" defaultValue={value("city", site?.city)} error={errors.city} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="On-site contact" name="contact_name"
              defaultValue={value("contact_name", site?.contact_name)} error={errors.contact_name} />
            <TextField label="Phone" name="contact_phone"
              defaultValue={value("contact_phone", site?.contact_phone)} error={errors.contact_phone} />
          </div>
          <TextField label="Email" name="contact_email" type="email"
            defaultValue={value("contact_email", site?.contact_email)} error={errors.contact_email} />
        </>
      )}
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------
export type EquipmentValues = {
  site_id: string;
  serial_number: string;
  manufacturer: string;
  model: string;
  equipment_type: string;
  cooling_capacity_kw: number | null;
  install_date: string | null;
  warranty_end_date: string | null;
  notes: string | null;
};

// The site list is sent once per page and shared by every equipment dialog on it.
const SiteOptionsContext = createContext<Option[]>([]);

export function SiteOptionsProvider({ sites, children }: { sites: Option[]; children: ReactNode }) {
  return <SiteOptionsContext value={sites}>{children}</SiteOptionsContext>;
}

export function EquipmentDialog({
  trigger, title, action, equipment, defaultSiteId,
}: {
  trigger: ReactNode;
  title: string;
  action: Action;
  equipment?: EquipmentValues;
  defaultSiteId?: string;
}) {
  const sites = use(SiteOptionsContext);
  return (
    <FormDialog trigger={trigger} title={title} action={action} submitLabel={equipment ? "Save" : "Add equipment"}>
      {({ errors, value }) => (
        <>
          <SelectField label="Site" name="site_id" options={sites} placeholder="Choose a site…"
            defaultValue={value("site_id", equipment?.site_id ?? defaultSiteId)} error={errors.site_id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Serial number" name="serial_number"
              defaultValue={value("serial_number", equipment?.serial_number)} error={errors.serial_number} />
            <SelectField label="Type" name="equipment_type" options={options(EQUIPMENT_TYPES)} placeholder="Choose…"
              defaultValue={value("equipment_type", equipment?.equipment_type)} error={errors.equipment_type} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Manufacturer" name="manufacturer"
              defaultValue={value("manufacturer", equipment?.manufacturer)} error={errors.manufacturer} />
            <TextField label="Model" name="model" defaultValue={value("model", equipment?.model)} error={errors.model} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Cooling capacity (kW)" name="cooling_capacity_kw" inputMode="decimal"
              defaultValue={value("cooling_capacity_kw", equipment?.cooling_capacity_kw)} error={errors.cooling_capacity_kw} />
            <TextField label="Installed on" name="install_date" type="date"
              defaultValue={value("install_date", equipment?.install_date)} error={errors.install_date} />
            <TextField label="Warranty until" name="warranty_end_date" type="date"
              defaultValue={value("warranty_end_date", equipment?.warranty_end_date)} error={errors.warranty_end_date} />
          </div>
          <TextAreaField label="Notes" name="notes" defaultValue={value("notes", equipment?.notes)} error={errors.notes} />
        </>
      )}
    </FormDialog>
  );
}
