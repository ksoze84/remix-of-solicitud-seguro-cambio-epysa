import { z } from 'zod';
import { PaymentType, RequestStatus } from '@/types';

export const paymentSchema = z.object({
  tipo: z.nativeEnum(PaymentType),
  montoClp: z.number().positive('El monto debe ser mayor a 0'),
  montoUsd: z.number().positive('El monto debe ser mayor a 0').optional(),
  fechaVencimiento: z.string().min(1, 'La fecha de vencimiento es requerida'),
  observaciones: z.string().optional(),
  isRemainingBalance: z.boolean().optional()
});

export const requestFormSchema = z.object({
  cliente: z.string()
    .min(1, 'El nombre del cliente es requerido')
    .max(200, 'El nombre del cliente no puede exceder 200 caracteres')
    .trim(),
  
  rut: z.string()
    .min(1, 'El RUT es requerido')
    .regex(/^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9kK]$/, 'Formato de RUT inválido'),
  
  montoNegocioUsd: z.number()
    .positive('El monto debe ser mayor a 0')
    .max(999999999, 'El monto es demasiado grande'),
  
  unidades: z.number()
    .int('Las unidades deben ser un número entero')
    .positive('Las unidades deben ser mayor a 0')
    .max(10000, 'Las unidades no pueden exceder 10,000'),
  
  numerosInternos: z.array(z.string().trim().max(50))
    .max(100, 'No se pueden agregar más de 100 números internos'),
  
  tcCliente: z.number().positive('El TC debe ser mayor a 0').optional(),
  
  banco: z.string()
    .max(100, 'El nombre del banco no puede exceder 100 caracteres')
    .optional(),
  
  diasForward: z.number()
    .int('Los días forward deben ser un número entero')
    .min(0)
    .max(360, 'Los días forward no pueden exceder 360')
    .optional(),
  
  fechaVencimiento: z.date().optional(),
  
  porcentajeCobertura: z.number()
    .min(0, 'El porcentaje debe ser mayor o igual a 0')
    .max(100, 'El porcentaje no puede exceder 100')
    .optional(),
  
  tcSpot: z.number().positive('El TC Spot debe ser mayor a 0').optional(),
  
  puntosForwards: z.number().optional(),
  
  tcAllIn: z.number().positive('El TC All In debe ser mayor a 0').optional(),
  
  tcReferencial: z.number().positive('El TC Referencial debe ser mayor a 0'),
  
  numeroSie: z.string()
    .max(50, 'El número SIE no puede exceder 50 caracteres')
    .trim()
    .optional(),
  
  notas: z.string()
    .max(2000, 'Las notas no pueden exceder 2000 caracteres')
    .trim()
    .optional(),
  
  estado: z.nativeEnum(RequestStatus),
  
  payments: z.array(paymentSchema)
    .min(1, 'Debe agregar al menos un método de pago')
    .max(50, 'No se pueden agregar más de 50 métodos de pago'),
  
  bankComparisonData: z.array(z.object({
    bankName: z.string(),
    tcSpot: z.number().optional(),
    puntosForwards: z.number().optional(),
    tcAllIn: z.number().optional()
  })).optional(),
  
  valorFacturaUsdNeto: z.number().positive().optional(),
  valorFacturaUsdTotal: z.number().positive().optional(),
  tcFactura: z.number().positive().optional(),
  totalFacturaClp: z.number().positive().optional()
});

export type RequestFormData = z.infer<typeof requestFormSchema>;
