/**
 * Sistema de Licencias para StockPOS
 * Implementa validación y activación de licencias
 */

import { ipcMain, app } from 'electron';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

// Configuración
const LICENSE_FILE_NAME = 'license.key';
const SECRET_KEY = 'StockPOS2024SecretKey!@#$'; // En producción real, usar env variable
const TRIAL_DAYS = 15;

interface LicenseData {
  email: string;
  type: 'trial' | 'basic' | 'pro' | 'enterprise';
  machineId: string;
  activatedAt: string;
  expiresAt: string | null; // null = perpetua
  features: string[];
}

interface LicenseInfo {
  isValid: boolean;
  type: 'trial' | 'basic' | 'pro' | 'enterprise' | 'none';
  daysRemaining: number | null;
  email: string | null;
  features: string[];
  message: string;
}

// Obtener un ID único de la máquina
function getMachineId(): string {
  const hostname = require('os').hostname();
  const platform = require('os').platform();
  const cpus = require('os').cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'unknown';
  
  const raw = `${hostname}-${platform}-${cpuModel}-StockPOS`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

// Ruta del archivo de licencia
function getLicenseFilePath(): string {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  return isDev
    ? path.join(__dirname, '../../../', LICENSE_FILE_NAME)
    : path.join(app.getPath('userData'), LICENSE_FILE_NAME);
}

// Encriptar datos de licencia
function encryptLicense(data: LicenseData): string {
  const json = JSON.stringify(data);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    crypto.createHash('sha256').update(SECRET_KEY).digest(),
    Buffer.alloc(16, 0)
  );
  let encrypted = cipher.update(json, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

// Desencriptar datos de licencia
function decryptLicense(encrypted: string): LicenseData | null {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      crypto.createHash('sha256').update(SECRET_KEY).digest(),
      Buffer.alloc(16, 0)
    );
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (error) {
    logger.error('License', 'Error al desencriptar licencia', error);
    return null;
  }
}

// Generar clave de licencia (para generador externo o testing)
export function generateLicenseKey(
  email: string,
  type: 'trial' | 'basic' | 'pro' | 'enterprise',
  machineId: string,
  expiresInDays: number | null = null
): string {
  const now = new Date();
  const expiresAt = expiresInDays 
    ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const features: string[] = [];
  
  // Asignar features según el tipo de licencia (acumulativos)
  if (type === 'enterprise' || type === 'pro' || type === 'basic') {
    features.push('pos', 'stock', 'customers', 'backup');
  }
  if (type === 'enterprise' || type === 'pro') {
    features.push('reports', 'multiUser', 'customization');
  }
  if (type === 'enterprise') {
    features.push('multiStore', 'cloudBackup', 'api');
  }
  if (type === 'trial') {
    features.push('pos', 'stock', 'customers');
  }

  const data: LicenseData = {
    email,
    type,
    machineId,
    activatedAt: now.toISOString(),
    expiresAt,
    features,
  };

  return encryptLicense(data);
}

// Guardar licencia
function saveLicense(licenseKey: string): boolean {
  try {
    const filePath = getLicenseFilePath();
    fs.writeFileSync(filePath, licenseKey, 'utf8');
    logger.info('License', 'Licencia guardada');
    return true;
  } catch (error) {
    logger.error('License', 'Error al guardar licencia', error);
    return false;
  }
}

// Cargar licencia
function loadLicense(): LicenseData | null {
  try {
    const filePath = getLicenseFilePath();
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const encrypted = fs.readFileSync(filePath, 'utf8');
    return decryptLicense(encrypted);
  } catch (error) {
    logger.error('License', 'Error al cargar licencia', error);
    return null;
  }
}

// Validar licencia
function validateLicense(): LicenseInfo {
  const data = loadLicense();
  const machineId = getMachineId();

  if (!data) {
    // Sin licencia - crear trial automáticamente
    const trialKey = generateLicenseKey('trial@local', 'trial', machineId, TRIAL_DAYS);
    saveLicense(trialKey);
    
    return {
      isValid: true,
      type: 'trial',
      daysRemaining: TRIAL_DAYS,
      email: null,
      features: ['pos', 'stock', 'customers'],
      message: `Período de prueba: ${TRIAL_DAYS} días restantes`,
    };
  }

  // Verificar machine ID
  if (data.machineId !== machineId) {
    logger.warn('License', 'Machine ID no coincide');
    return {
      isValid: false,
      type: 'none',
      daysRemaining: 0,
      email: data.email,
      features: [],
      message: 'Licencia no válida para esta computadora',
    };
  }

  // Verificar expiración
  if (data.expiresAt) {
    const now = new Date();
    const expiry = new Date(data.expiresAt);
    const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    if (daysRemaining <= 0) {
      return {
        isValid: false,
        type: data.type,
        daysRemaining: 0,
        email: data.email,
        features: [],
        message: data.type === 'trial' 
          ? 'Período de prueba expirado. Por favor active una licencia.'
          : 'Licencia expirada. Por favor renueve su licencia.',
      };
    }

    return {
      isValid: true,
      type: data.type,
      daysRemaining,
      email: data.email,
      features: data.features,
      message: data.type === 'trial'
        ? `Período de prueba: ${daysRemaining} días restantes`
        : `Licencia ${data.type}: ${daysRemaining} días restantes`,
    };
  }

  // Licencia perpetua
  return {
    isValid: true,
    type: data.type,
    daysRemaining: null,
    email: data.email,
    features: data.features,
    message: `Licencia ${data.type} activa`,
  };
}

// Activar licencia con clave
function activateLicense(licenseKey: string): { success: boolean; error?: string; info?: LicenseInfo } {
  try {
    const data = decryptLicense(licenseKey);
    
    if (!data) {
      return { success: false, error: 'Clave de licencia inválida' };
    }

    const machineId = getMachineId();
    
    // Verificar si la licencia es para esta máquina o es nueva
    if (data.machineId !== machineId && data.machineId !== 'ANY') {
      return { success: false, error: 'Esta licencia está registrada para otra computadora' };
    }

    // Actualizar machine ID si es necesario
    if (data.machineId === 'ANY') {
      data.machineId = machineId;
      data.activatedAt = new Date().toISOString();
      const newKey = encryptLicense(data);
      saveLicense(newKey);
    } else {
      saveLicense(licenseKey);
    }

    const info = validateLicense();
    logger.info('License', `Licencia activada: ${data.type}`, { email: data.email });
    
    return { success: true, info };
  } catch (error) {
    logger.error('License', 'Error al activar licencia', error);
    return { success: false, error: 'Error al procesar la licencia' };
  }
}

// Obtener info de licencia actual
function getLicenseInfo(): LicenseInfo {
  return validateLicense();
}

// Verificar si tiene feature
function hasFeature(feature: string): boolean {
  const info = validateLicense();
  return info.isValid && info.features.includes(feature);
}

// Registrar handlers IPC
export function registerLicenseHandlers(): void {
  // Validar licencia actual
  ipcMain.handle('license:validate', async () => {
    const info = validateLicense();
    return { success: info.isValid, ...info };
  });

  // Activar licencia
  ipcMain.handle('license:activate', async (_, licenseKey: string) => {
    return activateLicense(licenseKey);
  });

  // Obtener info de licencia
  ipcMain.handle('license:getInfo', async () => {
    return { success: true, data: getLicenseInfo() };
  });

  // Verificar feature
  ipcMain.handle('license:hasFeature', async (_, feature: string) => {
    return { success: true, hasFeature: hasFeature(feature) };
  });

  // Obtener machine ID (para soporte)
  ipcMain.handle('license:getMachineId', async () => {
    return { success: true, machineId: getMachineId() };
  });

  logger.info('License', 'Handlers de licencia registrados');
}

export { validateLicense, activateLicense, getLicenseInfo, hasFeature, getMachineId };
