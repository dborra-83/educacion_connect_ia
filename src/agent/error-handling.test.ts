import { describe, it, expect } from 'vitest';
import {
  ErrorTranslator,
  AlternativeGenerator,
  ErrorSeverityClassifier,
  ErrorHandler,
  ErrorSeverity,
} from './error-handler';
import {
  StudentNotFoundError,
  InvalidStudentIdError,
  EmptyQueryError,
  NoResultsFoundError,
  StudentHasDebtsError,
  InvalidCertificateTypeError,
  GenerationFailedError,
  ServiceUnavailableError,
  TimeoutError,
  UnauthorizedAccessError,
  ForbiddenAccessError,
} from '../types/errors';

describe('ErrorTranslator', () => {
  it('debe traducir StudentNotFoundError a mensaje amigable', () => {
    const error = new StudentNotFoundError('12345');
    const message = ErrorTranslator.translateError(error);
    expect(message).toContain('No pude encontrar tu información');
    expect(message).not.toContain('12345');
  });

  it('debe traducir ServiceUnavailableError a mensaje amigable', () => {
    const error = new ServiceUnavailableError('DynamoDB');
    const message = ErrorTranslator.translateError(error);
    expect(message).toContain('dificultades');
  });

  it('debe traducir StudentHasDebtsError a mensaje amigable', () => {
    const error = new StudentHasDebtsError('12345', 500);
    const message = ErrorTranslator.translateError(error);
    expect(message).toContain('pagos pendientes');
  });

  it('debe retornar mensaje genérico para errores desconocidos', () => {
    const error = new Error('Unknown technical error');
    const message = ErrorTranslator.translateError(error);
    expect(message).toContain('problema inesperado');
  });

  it('debe remover stack traces', () => {
    const message = 'Error message\n  at function (file.ts:10:5)';
    const sanitized = ErrorTranslator.sanitizeErrorMessage(message);
    expect(sanitized).toBe('Error message');
  });

  it('debe remover nombres de servicios técnicos', () => {
    const message = 'DynamoDB connection failed';
    const sanitized = ErrorTranslator.sanitizeErrorMessage(message);
    expect(sanitized).toContain('servicio');
  });
});

describe('AlternativeGenerator', () => {
  it('debe generar alternativas para StudentNotFoundError', () => {
    const error = new StudentNotFoundError('12345');
    const alternatives = AlternativeGenerator.generateAlternatives(error);
    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives.some((alt) => alt.includes('Verifica'))).toBe(true);
  });

  it('debe generar alternativas para ServiceUnavailableError', () => {
    const error = new ServiceUnavailableError('API');
    const alternatives = AlternativeGenerator.generateAlternatives(error);
    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives.some((alt) => alt.includes('minutos'))).toBe(true);
  });

  it('debe sugerir contacto humano para ServiceUnavailableError', () => {
    const error = new ServiceUnavailableError('API');
    const suggestion = AlternativeGenerator.generateHumanContactSuggestion(error);
    expect(suggestion).toContain('transferirte');
  });

  it('debe sugerir reintento para ServiceUnavailableError', () => {
    const error = new ServiceUnavailableError('API');
    const suggestion = AlternativeGenerator.generateRetrySuggestion(error);
    expect(suggestion).not.toBeNull();
    expect(suggestion).toContain('intenta de nuevo');
  });

  it('NO debe sugerir reintento para StudentHasDebtsError', () => {
    const error = new StudentHasDebtsError('12345', 500);
    const suggestion = AlternativeGenerator.generateRetrySuggestion(error);
    expect(suggestion).toBeNull();
  });
});

describe('ErrorSeverityClassifier', () => {
  it('debe clasificar UnauthorizedAccessError como CRITICAL', () => {
    const error = new UnauthorizedAccessError('resource');
    const severity = ErrorSeverityClassifier.classify(error);
    expect(severity).toBe(ErrorSeverity.CRITICAL);
  });

  it('debe clasificar ServiceUnavailableError como HIGH', () => {
    const error = new ServiceUnavailableError('API');
    const severity = ErrorSeverityClassifier.classify(error);
    expect(severity).toBe(ErrorSeverity.HIGH);
  });

  it('debe clasificar StudentHasDebtsError como MEDIUM', () => {
    const error = new StudentHasDebtsError('12345', 500);
    const severity = ErrorSeverityClassifier.classify(error);
    expect(severity).toBe(ErrorSeverity.MEDIUM);
  });

  it('debe clasificar InvalidStudentIdError como LOW', () => {
    const error = new InvalidStudentIdError('invalid');
    const severity = ErrorSeverityClassifier.classify(error);
    expect(severity).toBe(ErrorSeverity.LOW);
  });

  it('debe requerir escalamiento para errores CRITICAL', () => {
    const error = new UnauthorizedAccessError('resource');
    const requires = ErrorSeverityClassifier.requiresEscalation(error);
    expect(requires).toBe(true);
  });

  it('NO debe requerir escalamiento para errores LOW', () => {
    const error = new InvalidStudentIdError('invalid');
    const requires = ErrorSeverityClassifier.requiresEscalation(error);
    expect(requires).toBe(false);
  });

  it('debe permitir reintento para ServiceUnavailableError', () => {
    const error = new ServiceUnavailableError('API');
    const canRetry = ErrorSeverityClassifier.canRetry(error);
    expect(canRetry).toBe(true);
  });

  it('NO debe permitir reintento para StudentHasDebtsError', () => {
    const error = new StudentHasDebtsError('12345', 500);
    const canRetry = ErrorSeverityClassifier.canRetry(error);
    expect(canRetry).toBe(false);
  });
});

describe('ErrorHandler', () => {
  it('debe manejar StudentNotFoundError correctamente', () => {
    const error = new StudentNotFoundError('12345');
    const result = ErrorHandler.handleError(error);
    expect(result.userMessage).toContain('No pude encontrar');
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.severity).toBe(ErrorSeverity.LOW);
    expect(result.requiresHumanEscalation).toBe(false);
  });

  it('debe manejar ServiceUnavailableError correctamente', () => {
    const error = new ServiceUnavailableError('API');
    const result = ErrorHandler.handleError(error);
    expect(result.userMessage).toContain('dificultades');
    expect(result.severity).toBe(ErrorSeverity.HIGH);
    expect(result.requiresHumanEscalation).toBe(true);
    expect(result.canRetry).toBe(true);
  });

  it('debe generar mensaje completo con alternativas', () => {
    const result = {
      userMessage: 'Error message',
      alternatives: ['Alternative 1', 'Alternative 2'],
      requiresHumanEscalation: false,
      severity: ErrorSeverity.MEDIUM,
      canRetry: true,
    };
    const message = ErrorHandler.generateUserMessage(result);
    expect(message).toContain('Error message');
    expect(message).toContain('Puedes:');
    expect(message).toContain('1. Alternative 1');
  });

  it('debe manejar múltiples tipos de errores consistentemente', () => {
    const errors = [
      new StudentNotFoundError('12345'),
      new ServiceUnavailableError('API'),
      new StudentHasDebtsError('12345', 500),
    ];

    errors.forEach((error) => {
      const result = ErrorHandler.handleError(error);
      expect(result.userMessage).toBeTruthy();
      expect(result.alternatives).toBeDefined();
      expect(Object.values(ErrorSeverity)).toContain(result.severity);
    });
  });
});
