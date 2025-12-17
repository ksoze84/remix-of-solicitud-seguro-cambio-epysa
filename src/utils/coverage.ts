import { Payment, PaymentType, CoverageCalculation, COVERAGE_PAYMENT_TYPES } from "@/types";

export function calculateCoverage(payments: Payment[], porcentajeCobertura?: number, tcCliente?: number, montoNegocioUsd?: number, tcReferencial?: number): CoverageCalculation {
  // Exchange rate: use tcCliente if available, otherwise tcReferencial
  const exchangeRate = tcCliente || tcReferencial;
  
  // Debug logging
  console.log('calculateCoverage - tcReferencial:', tcReferencial, 'tcCliente:', tcCliente, 'exchangeRate:', exchangeRate);
  
  // Calculate total business in CLP from USD amount and exchange rate
  const totalNegocioClp = (montoNegocioUsd && exchangeRate) ? Number((montoNegocioUsd * exchangeRate).toFixed(0)) : 0;
  
  const baseCoberturaClp = payments
    .filter(p => COVERAGE_PAYMENT_TYPES.includes(p.tipo))
    .reduce((acc, p) => acc + (p.montoClp || 0), 0);
  
  const coberturaSugerida = totalNegocioClp > 0 
    ? Math.min(100, Math.max(0, (baseCoberturaClp / totalNegocioClp) * 100))
    : 0;
  
  const porcentajeUsar = porcentajeCobertura !== undefined ? porcentajeCobertura : coberturaSugerida;
  
  // Calculate base coverage in USD - use tcReferencial if available, otherwise use tcCliente
  const totalNegocioUsd = montoNegocioUsd || 0;
  const rateForBaseCoverage = tcReferencial || tcCliente;
  const baseCoberturaUsd = rateForBaseCoverage && rateForBaseCoverage > 0 ? Number((baseCoberturaClp / rateForBaseCoverage).toFixed(0)) : 0;
  
  // Exposición cubierta is based on % cobertura applied to base cobertura
  // Round covered exposure down to nearest thousand
  const exposicionCubiertaUsd = Math.floor((baseCoberturaUsd * porcentajeUsar / 100) / 1000) * 1000;
  const exposicionDescubiertaUsd = totalNegocioUsd - exposicionCubiertaUsd;
  
  // Convert to CLP for display
  const exposicionCubiertaClp = exchangeRate ? exposicionCubiertaUsd * exchangeRate : 0;
  const exposicionDescubiertaClp = exchangeRate ? exposicionDescubiertaUsd * exchangeRate : 0;

  
  return {
    totalNegocio: montoNegocioUsd || 0,
    baseCobertura: tcReferencial ? Number((baseCoberturaClp / tcReferencial).toFixed(0)) : 0,
    baseCoberturaAprobado: exchangeRate && exchangeRate > 0 ? Number((baseCoberturaClp / exchangeRate).toFixed(0)) : 0,
    coberturaSugerida: Number(coberturaSugerida.toFixed(2)),
    exposicionCubierta: Number(exposicionCubiertaUsd.toFixed(2)),
    exposicionDescubierta: Number(exposicionDescubiertaUsd.toFixed(2)),
    // Add CLP values for display
    baseCoberturaClp: Number(baseCoberturaClp.toFixed(0)),
    exposicionCubiertaClp: Number(exposicionCubiertaClp.toFixed(0)),
    exposicionDescubiertaClp: Number(exposicionDescubiertaClp.toFixed(0)),
    totalNegocioClp: totalNegocioClp
  };
}

export function formatCurrency(amount: number, currency: 'CLP' | 'USD' = 'CLP'): string {
  if (currency === 'USD') {
    // Format with Chilean locale: 1.000,00 and US$ prefix
    const formatted = new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    return `US$ ${formatted}`;
  }
  
  // Format CLP with Chilean locale: $1.000,00
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatPercentage(value: number): string {
  // Format percentage with comma as decimal separator
  const formatted = value.toFixed(2).replace('.', ',');
  return `${formatted}%`;
}

export function formatNumber(value: number, decimals: number = 2): string {
  // Format number with Chilean format: 1.000,00
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function getCoverageColor(percentage: number): string {
  if (percentage >= 80) return 'text-success';
  if (percentage >= 50) return 'text-warning';
  return 'text-destructive';
}

export function getCoverageBadgeVariant(percentage: number): 'default' | 'secondary' | 'destructive' {
  return 'secondary';
}