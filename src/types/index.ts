export enum UserRole {
  VENDEDOR = "VENDEDOR",
  ADMIN = "ADMIN",
  COORDINADOR = "COORDINADOR"
}

export enum RequestStatus {
  BORRADOR = "BORRADOR",
  EN_REVISION = "EN_REVISION", 
  APROBADA = "APROBADA",
  RECHAZADA = "RECHAZADA",
  ANULADA = "ANULADA"
}

export enum PaymentType {
  PIE = "PIE",
  CONTRA_ENTREGA = "CONTRA_ENTREGA",
  FINANCIAMIENTO = "FINANCIAMIENTO",
  CREDITO_EPYSA = "CREDITO_EPYSA",
  BEP = "BEP",
  CHATARRIZACION = "CHATARRIZACION"
}

export interface User {
  login: string;
  email?: string;
  role?: UserRole;
  createdAt?: Date;
  lastLoginAt?: Date;
}

export interface Payment {
  id?: string;
  requestId?: string;
  tipo: PaymentType;
  montoClp: number;
  montoUsd?: number;
  fechaVencimiento: string;
  observaciones?: string;
  isRemainingBalance?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CurrencyRequest {
  id?: string;
  sellerId: string;
  estado: RequestStatus;
  cliente: string;
  rut: string;
  montoNegocioUsd: number;
  unidades: number;
  numerosInternos?: string[];
  totalNegocioClp?: number;
  tcCliente?: number;
  banco?: string;
  diasForward?: number;
  fechaVencimiento?: Date;
  porcentajeCobertura?: number;
  tcSpot?: number;
  puntosForwards?: number;
  tcAllIn?: number;
  tcReferencial?: number;
  numeroSie?: string;
  notas?: string;
  payments: Payment[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CoverageCalculation {
  totalNegocio: number;
  baseCobertura: number;
  baseCoberturaAprobado: number;
  coberturaSugerida: number;
  exposicionCubierta: number;
  exposicionDescubierta: number;
  // CLP values for display
  totalNegocioClp?: number;
  baseCoberturaClp?: number;
  exposicionCubiertaClp?: number;
  exposicionDescubiertaClp?: number;
}

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PaymentType.PIE]: "Pie",
  [PaymentType.CONTRA_ENTREGA]: "Contra Entrega",
  [PaymentType.FINANCIAMIENTO]: "Financiamiento",
  [PaymentType.CREDITO_EPYSA]: "Crédito Epysa",
  [PaymentType.BEP]: "BEP",
  [PaymentType.CHATARRIZACION]: "Chatarrización"
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.BORRADOR]: "Borrador",
  [RequestStatus.EN_REVISION]: "En revisión",
  [RequestStatus.APROBADA]: "Aprobada",
  [RequestStatus.RECHAZADA]: "Rechazada",
  [RequestStatus.ANULADA]: "Anulada"
};

export const COVERAGE_PAYMENT_TYPES = [
  PaymentType.PIE,
  PaymentType.CONTRA_ENTREGA,
  PaymentType.FINANCIAMIENTO
];

export const FORWARD_DAYS = [7, 15, 30, 60, 90, 120, 180, 360];

export interface BankExecutive {
  id?: string;
  name: string;
  contactNumber: string;
  bankName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// BANKS constant removed - now using dynamic data from useBanks hook