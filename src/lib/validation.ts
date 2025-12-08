import { z } from 'zod';

// Brazilian phone number validation (with or without formatting)
const brazilianPhoneRegex = /^(\+55\s?)?(\(?\d{2}\)?\s?)?(\d{4,5}[-\s]?\d{4})$/;

// Brazilian CPF validation (with or without formatting)
const cpfRegex = /^(\d{3}\.?\d{3}\.?\d{3}-?\d{2})$/;

// Customer input validation schema
export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Nome contém caracteres inválidos'),
  phone: z
    .string()
    .trim()
    .min(10, 'Telefone deve ter pelo menos 10 dígitos')
    .max(20, 'Telefone inválido')
    .regex(brazilianPhoneRegex, 'Formato de telefone inválido'),
  cpf: z
    .string()
    .trim()
    .regex(cpfRegex, 'CPF inválido')
    .optional()
    .or(z.literal('')),
});

// Address validation schema
export const addressSchema = z.object({
  street: z.string().trim().max(200, 'Rua muito longa').optional(),
  number: z.string().trim().max(20, 'Número muito longo').optional(),
  complement: z.string().trim().max(100, 'Complemento muito longo').optional(),
  neighborhood: z.string().trim().max(100, 'Bairro muito longo').optional(),
  city: z.string().trim().max(100, 'Cidade muito longa').optional(),
  state: z.string().trim().max(2, 'Estado deve ter 2 letras').optional(),
  zipcode: z.string().trim().max(10, 'CEP inválido').optional(),
});

// Order validation schema
export const orderSchema = z.object({
  customer: customerSchema,
  deliveryType: z.enum(['retirada', 'entrega']),
  paymentMethod: z.enum(['cash', 'credit_card', 'debit_card', 'pix', 'pending']),
  address: addressSchema.optional(),
});

// Validate CPF algorithm (Luhn-like check)
export function validateCPF(cpf: string): boolean {
  if (!cpf) return true; // CPF is optional
  
  // Remove formatting
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

// Sanitize string input (remove potential XSS)
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

// Format phone number for display
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

// Format CPF for display
export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }
  return cpf;
}

// Validate customer data and return errors
export function validateCustomerData(data: {
  name: string;
  phone: string;
  cpf?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate with zod schema
  const result = customerSchema.safeParse(data);
  
  if (!result.success) {
    result.error.errors.forEach(err => {
      errors.push(err.message);
    });
  }
  
  // Additional CPF validation
  if (data.cpf && !validateCPF(data.cpf)) {
    errors.push('CPF inválido (dígitos verificadores incorretos)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}