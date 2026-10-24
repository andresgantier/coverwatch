import { z } from "zod";
import { optionalDate, optionalEmail, optionalText, requiredText } from "@/lib/forms";
import {
  BILLING_FREQUENCIES, CONTRACT_TYPES, EQUIPMENT_TYPES, SEGMENTS,
  type BillingFrequency, type ContractType, type EquipmentType, type Segment,
} from "@/lib/labels";

// App-side validation (first line). The database constraints remain the final word.

export const customerSchema = z.object({
  name: requiredText("Name").max(120, "Keep the name under 120 characters."),
  segment: z.enum(Object.keys(SEGMENTS) as [Segment, ...Segment[]], { error: "Choose a segment." }),
  contact_name: optionalText,
  contact_email: optionalEmail,
  contact_phone: optionalText,
  notes: optionalText,
});

export const siteSchema = z.object({
  name: requiredText("Site name"),
  street: requiredText("Street"),
  postal_code: z.string().trim().regex(/^\d{5}$/, "German postal codes have exactly 5 digits."),
  city: requiredText("City"),
  contact_name: optionalText,
  contact_phone: optionalText,
  contact_email: optionalEmail,
});

export const equipmentSchema = z
  .object({
    site_id: z.string().uuid("Choose a site."),
    serial_number: requiredText("Serial number"),
    manufacturer: requiredText("Manufacturer"),
    model: requiredText("Model"),
    equipment_type: z.enum(Object.keys(EQUIPMENT_TYPES) as [EquipmentType, ...EquipmentType[]], { error: "Choose a type." }),
    cooling_capacity_kw: z.coerce
      .number({ error: "Enter a number." })
      .gt(0, "Capacity must be greater than 0.")
      .max(2000, "Capacity must be at most 2,000 kW."),
    install_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Installation date is required."),
    warranty_end_date: optionalDate,
    notes: optionalText,
  })
  .refine((v) => !v.warranty_end_date || v.warranty_end_date >= v.install_date, {
    path: ["warranty_end_date"],
    message: "The warranty cannot end before the installation date.",
  });

const intField = (label: string, min: number, max: number) =>
  z.coerce.number({ error: `${label} must be a number.` }).int(`${label} must be a whole number.`)
    .min(min, `${label} must be at least ${min}.`).max(max, `${label} must be at most ${max}.`);
const isoDate = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required.`);

export const contractSchema = z
  .object({
    customer_id: z.string().uuid("Choose a customer."),
    contract_number: requiredText("Contract number").max(40),
    contract_type: z.enum(Object.keys(CONTRACT_TYPES) as [ContractType, ...ContractType[]], { error: "Choose a type." }),
    start_date: isoDate("Start date"),
    end_date: isoDate("End date"),
    notice_period_days: intField("Notice period", 0, 365),
    auto_renew: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    annual_value_eur: z.coerce.number({ error: "Enter an amount." }).min(0, "The value cannot be negative."),
    billing_frequency: z.enum(Object.keys(BILLING_FREQUENCIES) as [BillingFrequency, ...BillingFrequency[]]),
    sla_p1_hours: intField("P1 response time", 1, 720),
    sla_p2_hours: intField("P2 response time", 1, 720),
    sla_p3_hours: intField("P3 response time", 1, 720),
    preventive_visits_per_year: intField("Visits per year", 0, 12),
    notes: optionalText,
  })
  .refine((v) => v.end_date > v.start_date, { path: ["end_date"], message: "The contract must end after it starts." })
  .refine((v) => v.sla_p1_hours <= v.sla_p2_hours, { path: ["sla_p2_hours"], message: "P2 cannot be faster than P1." })
  .refine((v) => v.sla_p2_hours <= v.sla_p3_hours, { path: ["sla_p3_hours"], message: "P3 cannot be faster than P2." });

export const renewalSchema = z.object({
  contract_number: optionalText,
  annual_value_eur: z.coerce.number({ error: "Enter an amount." }).min(0, "The value cannot be negative."),
  duration_months: intField("Duration", 1, 60),
});

export const terminationSchema = z.object({
  terminated_on: isoDate("Termination date"),
  reason: requiredText("Reason").max(500),
});
