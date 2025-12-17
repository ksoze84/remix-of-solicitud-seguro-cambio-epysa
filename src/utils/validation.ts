export function validateEmail(email: string): boolean {
  const emailRegex = /^[^@]+@epysa\.cl$/;
  return emailRegex.test(email);
}

export function validateRUT(rut: string): boolean {
  // Remove formatting
  const cleanRut = rut.replace(/[^0-9kK]/g, '');
  
  if (cleanRut.length < 2) return false;
  
  const rutBody = cleanRut.slice(0, -1);
  const verifierDigit = cleanRut.slice(-1).toUpperCase();
  
  if (!/^\d+$/.test(rutBody)) return false;
  
  let sum = 0;
  let multiplier = 2;
  
  for (let i = rutBody.length - 1; i >= 0; i--) {
    sum += parseInt(rutBody[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const remainder = sum % 11;
  const calculatedDigit = remainder === 0 ? '0' : remainder === 1 ? 'K' : (11 - remainder).toString();
  
  return verifierDigit === calculatedDigit;
}

export function formatRUT(rut: string): string {
  const cleanRut = rut.replace(/[^0-9kK]/g, '');
  if (cleanRut.length < 2) return cleanRut;
  
  const rutBody = cleanRut.slice(0, -1);
  const verifierDigit = cleanRut.slice(-1);
  
  // Add thousands separators
  const formattedBody = rutBody.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${formattedBody}-${verifierDigit}`;
}

export function validatePositiveNumber(value: string | number): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num > 0;
}

export function validateFutureDate(date: string): boolean {
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return inputDate >= today;
}