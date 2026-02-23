/**
 * Logger centralizado para KioskoApp
 * Reemplaza todos los console.log/error por logging persistente
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

class Logger {
  private logDir: string;
  private currentLogFile: string;
  private isDev: boolean;
  private maxLogFiles: number = 7; // Mantener logs de 7 días
  private maxLogSize: number = 5 * 1024 * 1024; // 5MB por archivo

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    this.logDir = this.isDev
      ? path.join(__dirname, '../../../logs')
      : path.join(app.getPath('userData'), 'logs');
    
    this.ensureLogDir();
    this.currentLogFile = this.getLogFilePath();
    this.cleanOldLogs();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `kioskoapp-${date}.log`);
  }

  private formatEntry(entry: LogEntry): string {
    const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}${dataStr}\n`;
  }

  private writeToFile(entry: LogEntry): void {
    try {
      // Verificar si necesitamos un nuevo archivo (nuevo día o archivo muy grande)
      const newLogFile = this.getLogFilePath();
      if (newLogFile !== this.currentLogFile) {
        this.currentLogFile = newLogFile;
      }

      // Verificar tamaño del archivo
      if (fs.existsSync(this.currentLogFile)) {
        const stats = fs.statSync(this.currentLogFile);
        if (stats.size > this.maxLogSize) {
          // Rotar el archivo
          const rotatedPath = this.currentLogFile.replace('.log', `-${Date.now()}.log`);
          fs.renameSync(this.currentLogFile, rotatedPath);
        }
      }

      fs.appendFileSync(this.currentLogFile, this.formatEntry(entry));
    } catch (error) {
      // Fallback a console si no podemos escribir
      console.error('Error writing to log file:', error);
    }
  }

  private cleanOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDir);
      const logFiles = files
        .filter(f => f.startsWith('kioskoapp-') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.logDir, f),
          time: fs.statSync(path.join(this.logDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      // Eliminar archivos más antiguos que maxLogFiles días
      const cutoffDate = Date.now() - (this.maxLogFiles * 24 * 60 * 60 * 1000);
      logFiles
        .filter(f => f.time < cutoffDate)
        .forEach(f => {
          try {
            fs.unlinkSync(f.path);
          } catch (e) {
            // Ignorar errores al eliminar
          }
        });
    } catch (error) {
      // Ignorar errores de limpieza
    }
  }

  private log(level: LogLevel, category: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    // Escribir a archivo
    this.writeToFile(entry);

    // En desarrollo, también mostrar en consola
    if (this.isDev) {
      const consoleMethod = level === 'error' ? console.error : 
                           level === 'warn' ? console.warn : console.log;
      consoleMethod(`[${category}] ${message}`, data || '');
    }
  }

  debug(category: string, message: string, data?: unknown): void {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: unknown): void {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: unknown): void {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: unknown): void {
    this.log('error', category, message, data);
  }

  // Método para obtener logs recientes (útil para diagnóstico)
  getRecentLogs(lines: number = 100): string[] {
    try {
      if (!fs.existsSync(this.currentLogFile)) {
        return [];
      }
      const content = fs.readFileSync(this.currentLogFile, 'utf-8');
      const allLines = content.split('\n').filter(l => l.trim());
      return allLines.slice(-lines);
    } catch (error) {
      return [];
    }
  }

  // Obtener la ruta del directorio de logs
  getLogDir(): string {
    return this.logDir;
  }
}

// Singleton
let loggerInstance: Logger | null = null;

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

// Exportar funciones de conveniencia
export const logger = {
  debug: (category: string, message: string, data?: unknown) => 
    getLogger().debug(category, message, data),
  info: (category: string, message: string, data?: unknown) => 
    getLogger().info(category, message, data),
  warn: (category: string, message: string, data?: unknown) => 
    getLogger().warn(category, message, data),
  error: (category: string, message: string, data?: unknown) => 
    getLogger().error(category, message, data),
  getRecentLogs: (lines?: number) => getLogger().getRecentLogs(lines),
  getLogDir: () => getLogger().getLogDir(),
};

export default logger;
