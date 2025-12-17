import { z } from 'zod';
import { UserRole } from '@/types';

export const userProfileSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .regex(/^[^@]+@epysa\.cl$/, 'Solo se permiten correos @epysa.cl')
    .max(255, 'El email no puede exceder 255 caracteres'),
  
  nombreApellido: z.string()
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre no puede exceder 200 caracteres')
    .trim(),
  
  role: z.nativeEnum(UserRole),
  
  correoJefaturaDirecta: z.string()
    .email('Email inválido')
    .max(255, 'El email no puede exceder 255 caracteres')
    .optional()
    .or(z.literal('')),
  
  correoGerente: z.string()
    .email('Email inválido')
    .max(255, 'El email no puede exceder 255 caracteres')
    .optional()
    .or(z.literal(''))
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;
