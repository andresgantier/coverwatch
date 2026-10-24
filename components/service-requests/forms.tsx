"use client";

import type { ReactNode } from "react";
import { FormDialog } from "@/components/forms/form-dialog";
import { SelectField, TextAreaField, TextField, type Option } from "@/components/forms/field";
import { TICKET_PRIORITIES, options } from "@/lib/labels";
import type { FormState } from "@/lib/forms";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function TicketCreateDialog({
  trigger, action, equipment, technicians, now, defaultEquipmentId,
}: {
  trigger: ReactNode;
  action: Action;
  equipment: Option[];
  technicians: Option[];
  now: string; // Berlin local "YYYY-MM-DDTHH:mm"
  defaultEquipmentId?: string;
}) {
  return (
    <FormDialog trigger={trigger} title="New service request" action={action} submitLabel="Create ticket"
      description="The database checks whether the unit was under contract at the reported time and applies that contract's response time.">
      {({ errors, value }) => (
        <>
          <SelectField label="Unit" name="equipment_id" options={equipment} placeholder="Choose the unit…"
            defaultValue={value("equipment_id", defaultEquipmentId)} error={errors.equipment_id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Reported at" name="reported_at" type="datetime-local"
              defaultValue={value("reported_at", now)} error={errors.reported_at} />
            <SelectField label="Priority" name="priority" options={options(TICKET_PRIORITIES)} placeholder="Choose…"
              defaultValue={value("priority")} error={errors.priority} />
          </div>
          <TextAreaField label="What is wrong?" name="description" defaultValue={value("description")} error={errors.description} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Reported by" name="reported_by_name" placeholder="Caller at the site"
              defaultValue={value("reported_by_name")} error={errors.reported_by_name} />
            <SelectField label="Technician" name="assigned_technician_id" options={technicians} placeholder="Not assigned yet"
              defaultValue={value("assigned_technician_id")} error={errors.assigned_technician_id} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function TicketEditDialog({
  trigger, action, technicians, ticket,
}: {
  trigger: ReactNode;
  action: Action;
  technicians: Option[];
  ticket: { priority: string; description: string; reported_by_name: string | null; assigned_technician_id: string | null };
}) {
  return (
    <FormDialog trigger={trigger} title="Edit ticket" action={action}
      description="Changing the priority recalculates the response time that applies.">
      {({ errors, value }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Priority" name="priority" options={options(TICKET_PRIORITIES)}
              defaultValue={value("priority", ticket.priority)} error={errors.priority} />
            <SelectField label="Technician" name="assigned_technician_id" options={technicians} placeholder="Not assigned"
              defaultValue={value("assigned_technician_id", ticket.assigned_technician_id)} error={errors.assigned_technician_id} />
          </div>
          <TextAreaField label="Description" name="description" defaultValue={value("description", ticket.description)} error={errors.description} />
          <TextField label="Reported by" name="reported_by_name"
            defaultValue={value("reported_by_name", ticket.reported_by_name)} error={errors.reported_by_name} />
        </>
      )}
    </FormDialog>
  );
}

// Times recorded by the technician (or the coordinator on their behalf).
export function TicketProgressDialog({
  trigger, action, ticket, now,
}: {
  trigger: ReactNode;
  action: Action;
  now: string;
  ticket: {
    first_response_at: string; failure_start: string; failure_end: string; resolved_at: string; resolution_notes: string | null;
  };
}) {
  return (
    <FormDialog trigger={trigger} title="Record progress" action={action}
      description="First response is what the SLA measures. Failure start and end feed the unit's availability. Entering a resolution time closes the ticket.">
      {({ errors, value }) => (
        <>
          <TextField label="First response" name="first_response_at" type="datetime-local" max={now}
            defaultValue={value("first_response_at", ticket.first_response_at)} error={errors.first_response_at}
            hint="When a technician called back or arrived" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Failure started" name="failure_start" type="datetime-local" max={now}
              defaultValue={value("failure_start", ticket.failure_start)} error={errors.failure_start} />
            <TextField label="Failure ended" name="failure_end" type="datetime-local" max={now}
              defaultValue={value("failure_end", ticket.failure_end)} error={errors.failure_end} />
          </div>
          <TextField label="Resolved at" name="resolved_at" type="datetime-local" max={now}
            defaultValue={value("resolved_at", ticket.resolved_at)} error={errors.resolved_at}
            hint="Leave empty while the ticket is still open" />
          <TextAreaField label="What was done" name="resolution_notes"
            defaultValue={value("resolution_notes", ticket.resolution_notes)} error={errors.resolution_notes} />
        </>
      )}
    </FormDialog>
  );
}
