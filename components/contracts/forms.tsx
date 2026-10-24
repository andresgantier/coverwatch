"use client";

import type { ReactNode } from "react";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, SelectField, TextAreaField, TextField, type Option } from "@/components/forms/field";
import { BILLING_FREQUENCIES, CONTRACT_TYPES, EQUIPMENT_TYPES, options, type EquipmentType } from "@/lib/labels";
import type { FormState } from "@/lib/forms";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

// ---------------------------------------------------------------------------
// Contract terms (new draft or edit draft)
// ---------------------------------------------------------------------------
export type ContractValues = {
  customer_id: string;
  contract_number: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  notice_period_days: number;
  auto_renew: boolean;
  annual_value_eur: number;
  billing_frequency: string;
  sla_p1_hours: number;
  sla_p2_hours: number;
  sla_p3_hours: number;
  preventive_visits_per_year: number;
  notes: string | null;
};

export function ContractDialog({
  trigger, title, action, customers, contract, submitLabel,
}: {
  trigger: ReactNode;
  title: string;
  action: Action;
  customers: Option[];
  contract: ContractValues; // defaults for a new draft, or the saved draft
  submitLabel: string;
}) {
  return (
    <FormDialog trigger={trigger} title={title} action={action} submitLabel={submitLabel}
      description="Drafts can be changed freely. Once activated, the terms are frozen and change only through a renewal.">
      {({ errors, value }) => (
        <>
          <SelectField label="Customer" name="customer_id" options={customers} placeholder="Choose a customer…"
            defaultValue={value("customer_id", contract.customer_id)} error={errors.customer_id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Contract number" name="contract_number"
              defaultValue={value("contract_number", contract.contract_number)} error={errors.contract_number} />
            <SelectField label="Type" name="contract_type" options={options(CONTRACT_TYPES)}
              defaultValue={value("contract_type", contract.contract_type)} error={errors.contract_type} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Start" name="start_date" type="date"
              defaultValue={value("start_date", contract.start_date)} error={errors.start_date} />
            <TextField label="End" name="end_date" type="date"
              defaultValue={value("end_date", contract.end_date)} error={errors.end_date} />
            <TextField label="Notice (days)" name="notice_period_days" inputMode="numeric"
              defaultValue={value("notice_period_days", contract.notice_period_days)} error={errors.notice_period_days}
              hint="Decision deadline = end − notice" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Annual value (EUR)" name="annual_value_eur" inputMode="decimal"
              defaultValue={value("annual_value_eur", contract.annual_value_eur)} error={errors.annual_value_eur} />
            <SelectField label="Billing" name="billing_frequency" options={options(BILLING_FREQUENCIES)}
              defaultValue={value("billing_frequency", contract.billing_frequency)} error={errors.billing_frequency} />
            <TextField label="Visits per year" name="preventive_visits_per_year" inputMode="numeric"
              defaultValue={value("preventive_visits_per_year", contract.preventive_visits_per_year)}
              error={errors.preventive_visits_per_year} />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Response time (SLA, hours)</legend>
            <div className="grid grid-cols-3 gap-4">
              <TextField label="P1 urgent" name="sla_p1_hours" inputMode="numeric"
                defaultValue={value("sla_p1_hours", contract.sla_p1_hours)} error={errors.sla_p1_hours} />
              <TextField label="P2 high" name="sla_p2_hours" inputMode="numeric"
                defaultValue={value("sla_p2_hours", contract.sla_p2_hours)} error={errors.sla_p2_hours} />
              <TextField label="P3 normal" name="sla_p3_hours" inputMode="numeric"
                defaultValue={value("sla_p3_hours", contract.sla_p3_hours)} error={errors.sla_p3_hours} />
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="auto_renew" className="size-4 accent-primary"
              defaultChecked={value("auto_renew", contract.auto_renew ? "on" : "") === "on"} />
            Renews automatically if nobody gives notice
          </label>
          <TextAreaField label="Notes" name="notes" defaultValue={value("notes", contract.notes)} error={errors.notes} />
        </>
      )}
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Covered equipment of a draft
// ---------------------------------------------------------------------------
export type PickableUnit = {
  id: string;
  label: string;
  detail: string;
  type: string;
  selected: boolean;
  blockedBy: string | null; // contract that already covers it in this period
};

export function EquipmentPickerDialog({ trigger, action, units }: { trigger: ReactNode; action: Action; units: PickableUnit[] }) {
  return (
    <FormDialog trigger={trigger} title="Covered equipment" action={action} submitLabel="Save selection"
      description="Units of this customer. Units already covered by another contract in the same period cannot be added: the database would refuse to activate the contract.">
      {() => (
        <div className="max-h-[50svh] space-y-1 overflow-y-auto rounded-md border p-2">
          {units.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">This customer has no units in service.</p>}
          {units.map((u) => (
            <label key={u.id}
              className={`flex items-start gap-3 rounded-md p-2 text-sm ${u.blockedBy ? "opacity-60" : "hover:bg-accent"}`}>
              <input type="checkbox" name="equipment_id" value={u.id} defaultChecked={u.selected} disabled={Boolean(u.blockedBy) && !u.selected}
                className="mt-0.5 size-4 accent-primary" />
              <span className="min-w-0">
                <span className="block font-medium">{u.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {EQUIPMENT_TYPES[u.type as EquipmentType]} · {u.detail}
                  {u.blockedBy && <> · <span className="text-amber-700 dark:text-amber-400">covered by {u.blockedBy}</span></>}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Renewal and termination
// ---------------------------------------------------------------------------
export function RenewDialog({
  trigger, action, suggestedNumber, suggestedValue, startsOn,
}: { trigger: ReactNode; action: Action; suggestedNumber: string; suggestedValue: number; startsOn: string }) {
  return (
    <FormDialog trigger={trigger} title="Renew contract" action={action} submitLabel="Renew"
      description={`Creates the next version starting ${startsOn}, with the same terms and the units still in service. This version is then marked as renewed.`}>
      {({ errors, value }) => (
        <>
          <TextField label="New contract number" name="contract_number" placeholder={suggestedNumber}
            defaultValue={value("contract_number")} error={errors.contract_number}
            hint={`Leave empty to use ${suggestedNumber}`} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Annual value (EUR)" name="annual_value_eur" inputMode="decimal"
              defaultValue={value("annual_value_eur", suggestedValue)} error={errors.annual_value_eur}
              hint="Suggested: +3 % price adjustment" />
            <TextField label="Duration (months)" name="duration_months" inputMode="numeric"
              defaultValue={value("duration_months", 12)} error={errors.duration_months} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function TerminateDialog({ trigger, action, today }: { trigger: ReactNode; action: Action; today: string }) {
  return (
    <FormDialog trigger={trigger} title="Terminate contract" action={action} submitLabel="Terminate"
      description="Coverage ends on the termination date and planned visits after it are cancelled. This cannot be undone.">
      {({ errors, value }) => (
        <>
          <TextField label="Termination date" name="terminated_on" type="date"
            defaultValue={value("terminated_on", today)} error={errors.terminated_on} />
          <TextAreaField label="Reason" name="reason" defaultValue={value("reason")} error={errors.reason} />
        </>
      )}
    </FormDialog>
  );
}

export function PdfUploadDialog({ trigger, action }: { trigger: ReactNode; action: Action }) {
  return (
    <FormDialog trigger={trigger} title="Upload signed contract" action={action} submitLabel="Upload"
      description="PDF, up to 4 MB. It replaces the current file. Files are private and opened through short-lived links.">
      {({ errors }) => (
        <Field label="PDF file" name="file" error={errors.file}>
          <input id="file" name="file" type="file" accept="application/pdf"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm" />
        </Field>
      )}
    </FormDialog>
  );
}
