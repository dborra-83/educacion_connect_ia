import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditLogger, AuditAction, SensitivityLevel } from './audit-logger';
import { logger } from '../utils/logger';

vi.mock('../utils/logger');

describe('AuditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logAccess', () => {
    it('debe registrar acceso exitoso', async () => {
      await AuditLogger.logAccess({
        action: AuditAction.ACCESS_PROFILE,
        studentId: 'STU001',
        sessionId: 'session-123',
        resourceType: 'StudentProfile',
        resourceId: 'STU001',
        sensitivityLevel: SensitivityLevel.CONFIDENTIAL,
        success: true,
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Registro de auditoría',
        expect.objectContaining({
          action: AuditAction.ACCESS_PROFILE,
          studentId: 'STU001',
          sessionId: 'session-123',
          success: true,
        }),
      );
    });

    it('debe registrar acceso fallido con razón', async () => {
      await AuditLogger.logAccess({
        action: AuditAction.ACCESS_PROFILE,
        studentId: 'STU001',
        sessionId: 'session-123',
        resourceType: 'StudentProfile',
        sensitivityLevel: SensitivityLevel.CONFIDENTIAL,
        success: false,
        reason: 'Autenticación fallida',
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Registro de auditoría',
        expect.objectContaining({
          success: false,
          reason: 'Autenticación fallida',
        }),
      );
    });

    it('debe generar auditId único', async () => {
      await AuditLogger.logAccess({
        action: AuditAction.ACCESS_PROFILE,
        sessionId: 'session-123',
        resourceType: 'StudentProfile',
        sensitivityLevel: SensitivityLevel.CONFIDENTIAL,
        success: true,
      });

      const call = vi.mocked(logger.info).mock.calls[0];
      const auditLog = call[1];

      expect(auditLog.auditId).toMatch(/^AUDIT-\d+-[a-z0-9]+$/);
    });

    it('debe incluir timestamp', async () => {
      await AuditLogger.logAccess({
        action: AuditAction.ACCESS_PROFILE,
        sessionId: 'session-123',
        resourceType: 'StudentProfile',
        sensitivityLevel: SensitivityLevel.CONFIDENTIAL,
        success: true,
      });

      const call = vi.mocked(logger.info).mock.calls[0];
      const auditLog = call[1];

      expect(auditLog.timestamp).toBeDefined();
      expect(new Date(auditLog.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('logProfileAccess', () => {
    it('debe registrar acceso a perfil', async () => {
      await AuditLogger.logProfileAccess('STU001', 'session-123', true);

      expect(logger.info).toHaveBeenCalledWith(
        'Registro de auditoría',
        expect.objectContaining({
          action: AuditAction.ACCESS_PROFILE,
          studentId: 'STU001',
          resourceType: 'StudentProfile',
          sensitivityLevel: SensitivityLevel.CONFIDENTIAL,
        }),
      );
    });
  });

  describe('logAcademicRecordAccess', () => {
    it('debe registrar acceso a historial académico', async () => {
      await AuditLogger.logAcademicRecordAccess('STU001', 'session-123', true);

      expect(logger.info).toHaveBeenCalledWith(
        'Registro de auditoría',
        expect.objectContaining({
          action: AuditAction.ACCESS_ACADEMIC_RECORD,
          studentId: 'STU001',
          resourceType: 'AcademicRecord',
          sensitivityLevel: SensitivityLevel.CONFIDENTIAL,
        }),
      );
    });
  });

  describe('logFinancialDataAccess', () => {
    it('debe registrar acceso a datos financieros', async () => {
      await AuditLogger.logFinancialDataAccess('STU001', 'session-123', true);

      expect(logger.info).toHaveBeenCalledWith(
        'Registro de auditoría',
        expect.objectContaining({
          action: AuditAction.ACCESS_FINANCIAL_DATA,
          studentId: 'STU001',
          resourceType: 'FinancialData',
          sensitivityLevel: SensitivityLevel.RESTRICTED,
        }),
      );
    });
  });

  describe('logCertificateGeneration', () => {
    it('debe registrar generación de certificado', async () => {
      await AuditLogger.logCertificateGeneration(
        'STU001',
        'session-123',
        'enrollment',
        true,
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Registro de auditoría',
        expect.objectContaining({
          action: AuditAction.GENERATE_CERTIFICATE,
          studentId: 'STU001',
          resourceType: 'Certificate',
          metadata: { certificateType: 'enrollment' },
        }),
      );
    });
  });

  describe('logAuthenticationAttempt', () => {
    it('debe registrar autenticación exitosa', async () => {
      await AuditLogger.logAuthenticationAttempt('session-123', 'STU001', true);

      expect(logger.info).toHaveBeenCalledWith(
        'Registro de auditoría',
        expect.objectContaining({
          action: AuditAction.AUTHENTICATION_SUCCESS,
          studentId: 'STU001',
          success: true,
        }),
      );
    });

    it('debe registrar autenticación fallida', async () => {
      await AuditLogger.logAuthenticationAttempt(
        'session-123',
        'STU001',
        false,
        'Credenciales inválidas',
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Registro de auditoría',
        expect.objectContaining({
          action: AuditAction.AUTHENTICATION_FAILURE,
          success: false,
          reason: 'Credenciales inválidas',
        }),
      );
    });
  });

  describe('logUnauthorizedAccessAttempt', () => {
    it('debe registrar intento de acceso no autorizado', async () => {
      await AuditLogger.logUnauthorizedAccessAttempt(
        'session-123',
        'STU001',
        'STU002',
        'StudentProfile',
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Registro de auditoría',
        expect.objectContaining({
          action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
          success: false,
          metadata: {
            authenticatedStudentId: 'STU001',
            requestedStudentId: 'STU002',
          },
        }),
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Intento de acceso no autorizado detectado',
        expect.any(Object),
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Acción de seguridad requerida',
        expect.objectContaining({
          action: 'SECURITY_ALERT',
          severity: 'HIGH',
        }),
      );
    });
  });
});
