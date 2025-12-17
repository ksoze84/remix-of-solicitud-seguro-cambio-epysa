import { z } from 'zod';

export const bankExecutiveSchema = z.object({
  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre no puede exceder 200 caracteres')
    .trim(),
  
  bankName: z.string()
    .min(1, 'El nombre del banco es requerido')
    .max(100, 'El nombre del banco no puede exceder 100 caracteres')
    .trim(),
  
  contactNumber: z.string()
    .min(1, 'El número de contacto es requerido')
    .max(50, 'El número de contacto no puede exceder 50 caracteres')
    .regex(/^[+]?[0-9\s()-]+$/, 'Formato de teléfono inválido')
    .trim()
});

export type BankExecutiveFormData = z.infer<typeof bankExecutiveSchema>;
