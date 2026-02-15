import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthenticationMiddleware, AuthenticationContext } from './authentication';

vi.mock('../utils/logger');

describe('AuthenticationMiddleware', () => {
  let mockContext: AuthenticationContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      sessionId: 'session-123',
      studentId: 'STU001',
      contactId: 'contact-123',
      channel: 'VOICE',
      instanceARN: 'arn:aws:connect:us-east-1:123456789012:instance/test',
      attributes: {
        studentId: 'STU001',
      },
    };
  });

  describe('authenticate', () => {
    it('debe autenticar exitosamente con contexto válido', async () => {
      const result = await AuthenticationMiddleware.authenticate(mockContext);

      expect(result.authenticated).toBe(true);
      expect(result.studentId).toBe('STU001');
      expect(result.sessionId).toBe('session-123');
    });

    it('debe fallar si falta sessionId', async () => {
      mockContext.sessionId = '';

      const result = await AuthenticationMiddleware.authenticate(mockContext);

      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain('sesión incompleta');
    });

    it('debe fallar si falta contactId', async () => {
      mockContext.contactId = '';

      const result = await AuthenticationMiddleware.authenticate(mockContext);

      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain('sesión incompleta');
    });

    it('debe fallar si el instanceARN es inválido', async () => {
      mockContext.instanceARN = 'invalid-arn';

      const result = await AuthenticationMiddleware.authenticate(mockContext);

      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain('inválida');
    });

    it('debe fallar si el canal es inválido', async () => {
      mockContext.channel = 'INVALID';

      const result = await AuthenticationMiddleware.authenticate(mockContext);

      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain('inválida');
    });

    it('debe fallar si studentId no coincide con atributos', async () => {
      mockContext.attributes.studentId = 'STU002';

      const result = await AuthenticationMiddleware.authenticate(mockContext);

      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain('no verificada');
    });

    it('debe autenticar sin studentId si no se requiere', async () => {
      delete mockContext.studentId;

      const result = await AuthenticationMiddleware.authenticate(mockContext);

      expect(result.authenticated).toBe(true);
      expect(result.studentId).toBeUndefined();
    });
  });

  describe('requiresAuthentication', () => {
    it('debe requerir autenticación para operaciones sensibles', () => {
      expect(AuthenticationMiddleware.requiresAuthentication('getStudentProfile')).toBe(true);
      expect(AuthenticationMiddleware.requiresAuthentication('checkAcademicRecord')).toBe(true);
      expect(AuthenticationMiddleware.requiresAuthentication('generateCertificate')).toBe(true);
    });

    it('no debe requerir autenticación para operaciones públicas', () => {
      expect(AuthenticationMiddleware.requiresAuthentication('queryKnowledgeBase')).toBe(false);
      expect(AuthenticationMiddleware.requiresAuthentication('getHelp')).toBe(false);
    });
  });

  describe('verifyAccess', () => {
    it('debe permitir acceso a propios datos', async () => {
      const result = await AuthenticationMiddleware.verifyAccess('STU001', 'STU001');

      expect(result).toBe(true);
    });

    it('debe denegar acceso a datos de otro estudiante', async () => {
      const result = await AuthenticationMiddleware.verifyAccess('STU001', 'STU002');

      expect(result).toBe(false);
    });
  });
});
