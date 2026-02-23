import { describe, it, expect } from 'vitest';

// Funciones de validación para tests
export function validateBarcode(barcode: string): boolean {
  if (!barcode || barcode.trim().length === 0) return false;
  // Permitir códigos EAN-13, EAN-8, UPC-A, o códigos personalizados
  return /^[0-9A-Za-z-_]{1,50}$/.test(barcode.trim());
}

export function validatePrice(price: number): boolean {
  return typeof price === 'number' && price >= 0 && isFinite(price);
}

export function validateStock(stock: number): boolean {
  return typeof stock === 'number' && Number.isInteger(stock) && stock >= 0;
}

export function validateUsername(username: string): boolean {
  if (!username || username.trim().length < 3) return false;
  return /^[a-zA-Z0-9_]{3,30}$/.test(username.trim());
}

export function validatePassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 6;
}

export function validatePin(pin: string): boolean {
  return /^[0-9]{4}$/.test(pin);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  // Acepta formatos varios de teléfono argentino
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^[\+]?[0-9]{8,15}$/.test(cleaned);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Tests
describe('Validadores', () => {
  describe('validateBarcode', () => {
    it('debe aceptar códigos EAN-13 válidos', () => {
      expect(validateBarcode('7790001234567')).toBe(true);
    });

    it('debe aceptar códigos alfanuméricos', () => {
      expect(validateBarcode('PROD-001')).toBe(true);
    });

    it('debe rechazar códigos vacíos', () => {
      expect(validateBarcode('')).toBe(false);
      expect(validateBarcode('   ')).toBe(false);
    });

    it('debe rechazar caracteres especiales no permitidos', () => {
      expect(validateBarcode('código<script>')).toBe(false);
    });
  });

  describe('validatePrice', () => {
    it('debe aceptar precios válidos', () => {
      expect(validatePrice(100)).toBe(true);
      expect(validatePrice(0)).toBe(true);
      expect(validatePrice(99.99)).toBe(true);
    });

    it('debe rechazar precios negativos', () => {
      expect(validatePrice(-10)).toBe(false);
    });

    it('debe rechazar valores no numéricos', () => {
      expect(validatePrice(NaN)).toBe(false);
      expect(validatePrice(Infinity)).toBe(false);
    });
  });

  describe('validateStock', () => {
    it('debe aceptar stock válido', () => {
      expect(validateStock(0)).toBe(true);
      expect(validateStock(100)).toBe(true);
    });

    it('debe rechazar stock negativo', () => {
      expect(validateStock(-5)).toBe(false);
    });

    it('debe rechazar decimales', () => {
      expect(validateStock(10.5)).toBe(false);
    });
  });

  describe('validateUsername', () => {
    it('debe aceptar usernames válidos', () => {
      expect(validateUsername('admin')).toBe(true);
      expect(validateUsername('user_123')).toBe(true);
    });

    it('debe rechazar usernames cortos', () => {
      expect(validateUsername('ab')).toBe(false);
    });

    it('debe rechazar caracteres especiales', () => {
      expect(validateUsername('user@name')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('debe aceptar contraseñas de 6+ caracteres', () => {
      expect(validatePassword('123456')).toBe(true);
      expect(validatePassword('password123')).toBe(true);
    });

    it('debe rechazar contraseñas cortas', () => {
      expect(validatePassword('12345')).toBe(false);
    });
  });

  describe('validatePin', () => {
    it('debe aceptar PINs de 4 dígitos', () => {
      expect(validatePin('0000')).toBe(true);
      expect(validatePin('1234')).toBe(true);
    });

    it('debe rechazar PINs con longitud incorrecta', () => {
      expect(validatePin('123')).toBe(false);
      expect(validatePin('12345')).toBe(false);
    });

    it('debe rechazar PINs con letras', () => {
      expect(validatePin('12ab')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('debe limpiar espacios innecesarios', () => {
      expect(sanitizeInput('  texto  ')).toBe('texto');
    });

    it('debe eliminar caracteres peligrosos', () => {
      expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });
  });
});
