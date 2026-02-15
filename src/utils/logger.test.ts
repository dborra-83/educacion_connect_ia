import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel } from './logger';

describe('Logger', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;
  let consoleDebugSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe registrar mensajes de error', () => {
    logger.error('Test error message');
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const logEntry = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(logEntry.level).toBe(LogLevel.ERROR);
    expect(logEntry.message).toBe('Test error message');
    expect(logEntry.timestamp).toBeDefined();
  });

  it('debe registrar mensajes de advertencia', () => {
    logger.warn('Test warning message');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const logEntry = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
    expect(logEntry.level).toBe(LogLevel.WARN);
    expect(logEntry.message).toBe('Test warning message');
  });

  it('debe registrar mensajes informativos', () => {
    logger.info('Test info message');
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
    expect(logEntry.level).toBe(LogLevel.INFO);
    expect(logEntry.message).toBe('Test info message');
  });

  it('debe registrar mensajes de debug', () => {
    logger.debug('Test debug message');
    expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
    const logEntry = JSON.parse(consoleDebugSpy.mock.calls[0][0]);
    expect(logEntry.level).toBe(LogLevel.DEBUG);
    expect(logEntry.message).toBe('Test debug message');
  });

  it('debe incluir datos adicionales en el log', () => {
    const errorData = { code: 'ERR_001', details: 'Error details' };
    logger.error('Error with data', errorData);
    const logEntry = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(logEntry.data).toBeDefined();
    expect(logEntry.data[0]).toEqual(errorData);
  });

  it('debe incluir timestamp en formato ISO', () => {
    logger.info('Test timestamp');
    const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
    expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('debe manejar múltiples argumentos', () => {
    logger.error('Error', { code: 'ERR_001' }, { context: 'test' });
    const logEntry = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(logEntry.data).toHaveLength(2);
  });
});
