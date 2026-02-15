/**
 * Sistema de logging con niveles y formato estructurado
 * Preparado para integración con CloudWatch Logs
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: any;
}

class Logger {
  private formatLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      timestamp: new Date().toISOString(),
      message,
      ...(data && { data }),
    };
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    const entry = this.formatLogEntry(level, message, args.length > 0 ? args : undefined);

    // En desarrollo, usar console
    // En producción, esto se enviará a CloudWatch Logs
    switch (level) {
      case LogLevel.ERROR:
        console.error(JSON.stringify(entry, null, 2));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(entry, null, 2));
        break;
      case LogLevel.INFO:
        console.info(JSON.stringify(entry, null, 2));
        break;
      case LogLevel.DEBUG:
        console.debug(JSON.stringify(entry, null, 2));
        break;
    }
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }
}

export const logger = new Logger();
