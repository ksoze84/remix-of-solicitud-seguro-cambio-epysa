import { z } from 'zod';

export const emailSchema = z.string()
  .email('Email inválido')
  .regex(/^[^@]+@epysa\.cl$/, 'Solo se permiten correos @epysa.cl')
  .max(255, 'El email no puede exceder 255 caracteres');

export const passwordSchema = z.string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es requerida')
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

export const resetPasswordSchema = z.object({
  email: emailSchema
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
