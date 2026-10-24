import { z } from "zod";
import { optionalDate, optionalEmail, optionalText, requiredText } from "@/lib/forms";
import { EQUIPMENT_TYPES, SEGMENTS, type EquipmentType, type Segment } from "@/lib/labels";

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
