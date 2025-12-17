/**
 * Secure logging utility that redacts sensitive information
 * and only logs verbose information in development mode
 */

const SENSITIVE_KEYS = [
  'password',
  'token',
  'api_key',
  'secret',
  'authorization',
  'credit_card',
  'ssn',
  'rut',
  'email',
  'phone',
  'address'
];

const isDevelopment = import.meta.env.DEV;

/**
 * Redacts sensitive data from an object
 */
function redactSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => 
      lowerKey.includes(sensitiveKey)
    );

    if (isSensitive) {
      redacted[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Secure logger that redacts sensitive information
 */
export const secureLogger = {
  info: (message: string, data?: any) => {
    if (isDevelopment) {
      console.info(message, data ? redactSensitiveData(data) : '');
    }
  },

  warn: (message: string, data?: any) => {
    console.warn(message, data ? redactSensitiveData(data) : '');
  },

  error: (message: string, error?: any) => {
    if (isDevelopment) {
      console.error(message, error ? redactSensitiveData(error) : '');
    } else {
      // In production, only log the error message without sensitive details
      console.error(message);
    }
  },

  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.debug(message, data ? redactSensitiveData(data) : '');
    }
  }
};
