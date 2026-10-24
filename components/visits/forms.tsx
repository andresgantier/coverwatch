"use client";

import type { ReactNode } from "react";
import { FormDialog } from "@/components/forms/form-dialog";
import { SelectField, TextAreaField, TextField, type Option } from "@/components/forms/field";
import { VISIT_RESULTS, options } from "@/lib/labels";
import type { FormState } from "@/lib/forms";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function PlanVisitDialog({
  trigger, action, technicians, visit,
}: {
  trigger: ReactNode;
  action: Action;
  technicians: Option[];
  visit: { label: string; dueDate: string; scheduled_date: string | null; assigned_technician_id: string | null };
}) {
  return (
    <FormDialog trigger={trigger} title={`Plan ${visit.label}`} action={action} submitLabel="Save plan"
      description={`Due by contract on ${visit.dueDate}. The due date is fixed; choose who goes and when.`}>
      {({ errors, value }) => (
        <>
          <SelectField label="Technician" name="assigned_technician_id" options={technicians} placeholder="Not assigned"
            defaultValue={value("assigned_technician_id", visit.assigned_technician_id)} error={errors.assigned_technician_id} />
          <TextField label="Scheduled for" name="scheduled_date" type="date"
            defaultValue={value("scheduled_date", visit.scheduled_date)} error={errors.scheduled_date} />
        </>
      )}
    </FormDialog>
  );
}

export function VisitOutcomeDialog({
  trigger, action, today, label,
}: { trigger: ReactNode; action: Action; today: string; label: string }) {
  return (
    <FormDialog trigger={trigger} title={`Record ${label}`} action={action} submitLabel="Save visit"
      description="Done within 14 days of the due date counts as on time for the plan compliance KPI.">
      {({ errors, value }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Visit date" name="actual_date" type="date" max={today}
              defaultValue={value("actual_date", today)} error={errors.actual_date} />
            <SelectField label="Result" name="result" options={options(VISIT_RESULTS)} placeholder="Choose…"
              defaultValue={value("result")} error={errors.result} />
          </div>
          <TextAreaField label="Observations" name="observations" placeholder="Filters, refrigerant pressure, findings…"
            defaultValue={value("observations")} error={errors.observations} />
        </>
      )}
    </FormDialog>
  );
}
