import { z } from "zod";

export function validateIsraeliId(id: string): boolean {
  if (!/^\d{9}$/.test(id)) return false;
  const sum = id.split("").reduce((acc, digit, i) => {
    let n = parseInt(digit) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    return acc + n;
  }, 0);
  return sum % 10 === 0;
}

export const registrationSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().min(2, "Last name must be at least 2 characters"),
  id_number: z
    .string()
    .length(9, "ID number must be exactly 9 digits")
    .regex(/^\d{9}$/, "ID number must contain only digits")
    .refine(validateIsraeliId, "Invalid Israeli ID number (checksum failed)"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  project_id: z.string().min(1, "Please select a project"),
  priority: z.enum(["DISABLED", "MILITARY_RESERVES", "LOCAL_RESIDENT", "YOUNG_COUPLE", "STANDARD"]),
  disclaimer: z.boolean().refine((v) => v === true, "You must accept the disclaimer"),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;
