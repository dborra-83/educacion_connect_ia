/**
 * Modelos de datos principales del sistema
 */

import { StudentProfile, AcademicRecord } from './mcp-tools';

// ============================================================================
// Perfil Unificado (DynamoDB)
// ============================================================================

export interface UnifiedProfile {
  // Clave de partición
  PK: string; // "STUDENT#{studentId}"
  SK: string; // "PROFILE"

  // Datos básicos
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  identificationNumber: string;

  // Datos académicos
  program: {
    code: string;
    name: string;
    faculty: string;
    enrollmentDate: string;
    expectedGraduationDate?: string;
  };
  academicStatus: string;

  // Datos CRM
  crmData: {
    lastContactDate: string;
    lastContactChannel: string;
    preferredLanguage: string;
    communicationPreferences: string[];
    tags: string[];
    notes?: string;
  };

  // Datos LMS
  lmsData: {
    userId: string;
    lastLoginDate: string;
    activeCourses: number;
    completionRate: number;
  };

  // Metadatos
  createdAt: string;
  updatedAt: string;
  version: number;
}

// ============================================================================
// Historial Académico (API Response)
// ============================================================================

export interface AcademicHistory {
  studentId: string;
  program: string;

  // Resumen académico
  summary: {
    gpa: number;
    totalCredits: number;
    completedCredits: number;
    remainingCredits: number;
    academicStanding: string;
    semestersCompleted: number;
  };

  // Materias por semestre
  semesters: Array<{
    semesterCode: string;
    year: number;
    period: string; // "1" | "2" | "summer"
    courses: Array<{
      courseCode: string;
      courseName: string;
      credits: number;
      grade: string;
      numericGrade: number;
      status: string;
      professor: string;
    }>;
    semesterGPA: number;
  }>;

  // Alertas académicas
  alerts: Array<{
    alertId: string;
    type: string;
    severity: string;
    message: string;
    createdAt: string;
    resolved: boolean;
  }>;

  // Deudas y bloqueos
  financialStatus: {
    hasDebts: boolean;
    debtAmount?: number;
    blockedServices: string[];
  };
}

// ============================================================================
// Base de Conocimiento (Kendra/S3)
// ============================================================================

export interface KnowledgeDocument {
  documentId: string;
  title: string;
  documentType: 'program' | 'faq' | 'procedure' | 'policy';
  content: string;

  // Metadatos para búsqueda
  metadata: {
    program?: string;
    faculty?: string;
    category: string;
    keywords: string[];
    lastUpdated: string;
    version: string;
  };

  // Ubicación
  source: {
    bucket: string;
    key: string;
    url: string;
  };
}

// ============================================================================
// Certificado
// ============================================================================

export interface Certificate {
  certificateId: string;
  studentId: string;
  certificateType: string;

  // Datos del certificado
  data: {
    studentName: string;
    identificationNumber: string;
    program: string;
    issueDate: string;
    validUntil?: string;
    additionalInfo: any;
  };

  // Generación y entrega
  generation: {
    generatedAt: string;
    generatedBy: string; // "system" | userId
    pdfUrl: string;
    pdfSize: number;
  };

  delivery: {
    method: string;
    destination: string;
    status: string;
    sentAt?: string;
    attempts: number;
  };

  // Seguridad
  verification: {
    verificationCode: string;
    qrCode: string;
    digitalSignature: string;
  };

  // Auditoría
  audit: {
    createdAt: string;
    accessLog: Array<{
      timestamp: string;
      action: string;
      userId?: string;
    }>;
  };
}

// ============================================================================
// Sesión de Conversación
// ============================================================================

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ConversationContext {
  sessionId: string;
  studentId?: string;
  studentProfile?: StudentProfile;
  conversationHistory: Message[];
  currentIntent?: string;
  entities: Map<string, any>;
}

export interface AgentResponse {
  message: string;
  actions?: Action[];
  requiresHumanEscalation: boolean;
  metadata?: {
    toolsUsed: string[];
    processingTime: number;
  };
}

export interface Action {
  type: 'tool_call' | 'transfer' | 'end_conversation';
  toolName?: string;
  parameters?: any;
  result?: any;
}

export interface ConversationSession {
  sessionId: string;
  studentId?: string;

  // Estado de la conversación
  status: 'active' | 'completed' | 'escalated';
  startTime: string;
  endTime?: string;
  duration?: number;

  // Mensajes
  messages: Array<{
    messageId: string;
    role: string;
    content: string;
    timestamp: string;
  }>;

  // Contexto
  context: {
    currentIntent?: string;
    entities: Record<string, any>;
    toolsUsed: string[];
    actionsCompleted: string[];
  };

  // Métricas
  metrics: {
    messageCount: number;
    toolCallCount: number;
    averageResponseTime: number;
    satisfactionScore?: number;
  };

  // Escalamiento
  escalation?: {
    reason: string;
    timestamp: string;
    agentId?: string;
  };
}
