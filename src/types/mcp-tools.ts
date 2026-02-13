/**
 * Interfaces para las herramientas MCP (Model Context Protocol)
 * Estas interfaces definen los contratos de entrada/salida para cada herramienta
 */

// ============================================================================
// getStudentProfile - Recuperar perfil unificado del estudiante
// ============================================================================

export interface GetStudentProfileInput {
  studentId: string;
  includeAcademic?: boolean;
  includeCRM?: boolean;
}

export interface StudentProfile {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  program?: {
    name: string;
    code: string;
    enrollmentDate: string;
  };
  academicStatus?: 'active' | 'inactive' | 'graduated';
  crmData?: {
    lastContact: string;
    preferredChannel: string;
    tags: string[];
  };
}

// ============================================================================
// queryKnowledgeBase - Buscar información en base de conocimiento
// ============================================================================

export interface QueryKnowledgeBaseInput {
  query: string;
  maxResults?: number;
  filters?: {
    documentType?: string[];
    program?: string;
  };
}

export interface KnowledgeBaseResult {
  results: Array<{
    title: string;
    excerpt: string;
    relevanceScore: number;
    source: string;
    documentType: string;
  }>;
  totalResults: number;
}

// ============================================================================
// checkAcademicRecord - Consultar historial académico
// ============================================================================

export interface CheckAcademicRecordInput {
  studentId: string;
  includeCourses?: boolean;
  includeGrades?: boolean;
  semester?: string;
}

export interface AcademicRecord {
  studentId: string;
  gpa: number;
  totalCredits: number;
  completedCredits: number;
  academicStanding: 'good' | 'probation' | 'warning';
  courses?: Array<{
    courseCode: string;
    courseName: string;
    semester: string;
    grade: string;
    status: 'passed' | 'failed' | 'in_progress';
    credits: number;
  }>;
  alerts?: Array<{
    type: 'failed_course' | 'low_gpa' | 'missing_credits';
    message: string;
    severity: 'high' | 'medium' | 'low';
  }>;
}

// ============================================================================
// generateCertificate - Generar y enviar certificados
// ============================================================================

export interface GenerateCertificateInput {
  studentId: string;
  certificateType: 'enrollment' | 'grades' | 'graduation';
  deliveryMethod: 'email' | 'download';
  language?: 'es' | 'en';
}

export interface GenerateCertificateResult {
  certificateId: string;
  status: 'generated' | 'sent' | 'failed';
  generatedAt: string;
  deliveryStatus?: {
    method: string;
    destination: string;
    sentAt?: string;
  };
  downloadUrl?: string;
  expiresAt?: string;
}
