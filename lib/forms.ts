import { z } from "zod";

// Result of a form Server Action, shown by the form on screen.
export type FormState = {
  ok: boolean;
  message?: string; // success message (toast)
  formError?: string; // error not tied to one field
  fieldErrors?: Record<string, string>; // error shown under a field
  values?: Record<string, string>; // what the user typed, shown again after an error
  attempt?: number; // changes on every failed submission so the fields are rebuilt with `values`
};

export const initialFormState: FormState = { ok: false };

// Empty form inputs arrive as "": treat them as "not provided".
const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const optionalText = z.preprocess(blankToNull, z.string().trim().nullable());
export const optionalEmail = z.preprocess(
  blankToNull,
  z.string().trim().regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Enter a valid email address.").nullable(),
);
export const optionalDate = z.preprocess(
  blankToNull,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.").nullable(),
);
export const requiredText = (label: string) => z.string().trim().min(1, `${label} is required.`);

// Keeps the submitted values so the form can show them again after an error
// (React resets uncontrolled forms after every submission).
export function withValues(state: FormState, formData: FormData): FormState {
  const values: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$ACTION")) values[k] = v;
  });
  return { ...state, values, attempt: Date.now() };
}

// Validates FormData against a schema. Returns the data, or a FormState with one message per field.
export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { data: z.infer<T>; error?: never } | { data?: never; error: FormState } {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (result.success) return { data: result.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return { error: withValues({ ok: false, fieldErrors, formError: "Please check the highlighted fields." }, formData) };
}
