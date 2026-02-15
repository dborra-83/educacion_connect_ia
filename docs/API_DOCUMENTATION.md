# Documentación de APIs - Herramientas MCP

## Índice
1. [getStudentProfile](#getstudentprofile)
2. [queryKnowledgeBase](#queryknowledgebase)
3. [checkAcademicRecord](#checkacademicrecord)
4. [generateCertificate](#generatecertificate)

---

## getStudentProfile

Obtiene el perfil unificado de un estudiante integrando datos de CRM, LMS y sistema académico.

### Entrada

```typescript
interface GetStudentProfileInput {
  studentId: string;
}
```

#### Parámetros
- `studentId` (string, requerido): Identificador único del estudiante

### Salida

```typescript
interface StudentProfile {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  program: string;
  enrollmentDate: string;
  academicStatus: string;
}
```

### Ejemplo de Uso

```typescript
import { getStudentProfile } from './tools/get-student-profile';

const result = await getStudentProfile({
  studentId: 'STU001'
});

console.log(result.profile.firstName); // "Carlos"
```

### Códigos de Error

| Código | Descripción | Acción Recomendada |
|--------|-------------|-------------------|
| `STUDENT_NOT_FOUND` | El estudiante no existe en el sistema | Verificar el ID del estudiante |
| `SERVICE_UNAVAILABLE` | El servicio de perfiles no está disponible | Reintentar después de unos segundos |
| `INVALID_STUDENT_ID` | El formato del ID es inválido | Verificar formato del ID |

### Reintentos

La función implementa reintentos automáticos con backoff exponencial:
- Máximo 3 intentos
- Delay inicial: 1 segundo
- Multiplicador: 2x

---

## queryKnowledgeBase

Busca información en la base de conocimiento académica.

### Entrada

```typescript
interface QueryKnowledgeBaseInput {
  query: string;
  documentType?: 'program' | 'faq' | 'procedure' | 'policy';
  program?: string;
  maxResults?: number;
}
```

#### Parámetros
- `query` (string, requerido): Consulta de búsqueda
- `documentType` (string, opcional): Tipo de documento a buscar
- `program` (string, opcional): Filtrar por programa académico
- `maxResults` (number, opcional): Número máximo de resultados (default: 5)

### Salida

```typescript
interface QueryKnowledgeBaseOutput {
  results: Array<{
    documentId: string;
    title: string;
    excerpt: string;
    relevanceScore: number;
    source: string;
  }>;
  totalResults: number;
}
```

### Ejemplo de Uso

```typescript
import { queryKnowledgeBase } from './tools/query-knowledge-base';

const result = await queryKnowledgeBase({
  query: 'requisitos de graduación',
  documentType: 'procedure',
  program: 'Ingeniería de Sistemas',
  maxResults: 3
});

result.results.forEach(doc => {
  console.log(`${doc.title}: ${doc.excerpt}`);
});
```

### Códigos de Error

| Código | Descripción | Acción Recomendada |
|--------|-------------|-------------------|
| `EMPTY_QUERY` | La consulta está vacía | Proporcionar una consulta válida |
| `NO_RESULTS_FOUND` | No se encontraron resultados | Reformular la consulta |
| `SERVICE_UNAVAILABLE` | El servicio de búsqueda no está disponible | Reintentar más tarde |

---

## checkAcademicRecord

Consulta el historial académico completo de un estudiante.

### Entrada

```typescript
interface CheckAcademicRecordInput {
  studentId: string;
  includeSemesters?: boolean;
  includeAlerts?: boolean;
}
```

#### Parámetros
- `studentId` (string, requerido): Identificador del estudiante
- `includeSemesters` (boolean, opcional): Incluir detalle por semestre (default: true)
- `includeAlerts` (boolean, opcional): Incluir alertas académicas (default: true)

### Salida

```typescript
interface AcademicRecord {
  studentId: string;
  gpa: number;
  totalCredits: number;
  completedCredits: number;
  academicStanding: string;
  semesters?: Array<{
    semesterCode: string;
    courses: Array<{
      courseCode: string;
      courseName: string;
      grade: string;
      credits: number;
    }>;
    semesterGPA: number;
  }>;
  alerts?: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  hasDebts: boolean;
}
```

### Ejemplo de Uso

```typescript
import { checkAcademicRecord } from './tools/check-academic-record';

const result = await checkAcademicRecord({
  studentId: 'STU001',
  includeSemesters: true,
  includeAlerts: true
});

console.log(`GPA: ${result.record.gpa}`);
console.log(`Créditos completados: ${result.record.completedCredits}`);

if (result.record.alerts && result.record.alerts.length > 0) {
  console.log('Alertas académicas:');
  result.record.alerts.forEach(alert => {
    console.log(`- ${alert.message}`);
  });
}
```

### Códigos de Error

| Código | Descripción | Acción Recomendada |
|--------|-------------|-------------------|
| `STUDENT_NOT_FOUND` | El estudiante no existe | Verificar el ID |
| `NO_ACADEMIC_RECORD` | No hay historial académico | Verificar que el estudiante esté matriculado |
| `SERVICE_UNAVAILABLE` | El servicio académico no está disponible | Reintentar más tarde |

---

## generateCertificate

Genera un certificado académico para un estudiante.

### Entrada

```typescript
interface GenerateCertificateInput {
  studentId: string;
  certificateType: 'enrollment' | 'grades' | 'graduation' | 'conduct';
  deliveryMethod: 'email' | 'download';
  language?: 'es' | 'en';
}
```

#### Parámetros
- `studentId` (string, requerido): Identificador del estudiante
- `certificateType` (string, requerido): Tipo de certificado
- `deliveryMethod` (string, requerido): Método de entrega
- `language` (string, opcional): Idioma del certificado (default: 'es')

### Salida

```typescript
interface GenerateCertificateOutput {
  certificateId: string;
  pdfUrl?: string;
  deliveryStatus: 'sent' | 'ready' | 'failed';
  message: string;
}
```

### Ejemplo de Uso

```typescript
import { generateCertificate } from './tools/generate-certificate';

const result = await generateCertificate({
  studentId: 'STU001',
  certificateType: 'enrollment',
  deliveryMethod: 'email',
  language: 'es'
});

if (result.deliveryStatus === 'sent') {
  console.log('Certificado enviado exitosamente');
  console.log(`ID: ${result.certificateId}`);
}
```

### Códigos de Error

| Código | Descripción | Acción Recomendada |
|--------|-------------|-------------------|
| `STUDENT_HAS_DEBTS` | El estudiante tiene deudas pendientes | Informar al estudiante sobre las deudas |
| `INVALID_CERTIFICATE_TYPE` | Tipo de certificado no válido | Verificar tipos disponibles |
| `GENERATION_FAILED` | Error al generar el PDF | Reintentar o contactar soporte |
| `DELIVERY_FAILED` | Error al enviar el certificado | Verificar email o reintentar |

### Validaciones Previas

Antes de generar un certificado, el sistema verifica:
1. ✅ Identidad del estudiante
2. ✅ Ausencia de deudas pendientes
3. ✅ Elegibilidad para el tipo de certificado solicitado

---

## Manejo de Errores General

Todas las herramientas MCP siguen un patrón consistente de manejo de errores:

### Estructura de Error

```typescript
interface ToolError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}
```

### Ejemplo de Manejo

```typescript
try {
  const result = await getStudentProfile({ studentId: 'STU001' });
  // Procesar resultado
} catch (error) {
  if (error.code === 'STUDENT_NOT_FOUND') {
    console.log('Estudiante no encontrado');
  } else if (error.code === 'SERVICE_UNAVAILABLE') {
    console.log('Servicio temporalmente no disponible');
    // Reintentar después
  } else {
    console.error('Error inesperado:', error);
  }
}
```

## Mejores Prácticas

### 1. Validación de Entrada
Siempre valide los parámetros antes de llamar a las herramientas:

```typescript
if (!studentId || studentId.trim() === '') {
  throw new Error('studentId es requerido');
}
```

### 2. Manejo de Timeouts
Configure timeouts apropiados para operaciones largas:

```typescript
const timeout = 30000; // 30 segundos
const result = await Promise.race([
  getStudentProfile({ studentId }),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), timeout)
  )
]);
```

### 3. Logging
Registre todas las llamadas a herramientas para auditoría:

```typescript
logger.info('Llamando a getStudentProfile', { studentId });
const result = await getStudentProfile({ studentId });
logger.info('getStudentProfile completado', { studentId, success: true });
```

### 4. Caché
Implemente caché para reducir llamadas redundantes:

```typescript
const cache = new Map();
const cacheKey = `profile_${studentId}`;

if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}

const result = await getStudentProfile({ studentId });
cache.set(cacheKey, result);
return result;
```

## Límites y Cuotas

| Herramienta | Límite por Minuto | Límite por Día |
|-------------|-------------------|----------------|
| getStudentProfile | 100 | 10,000 |
| queryKnowledgeBase | 50 | 5,000 |
| checkAcademicRecord | 100 | 10,000 |
| generateCertificate | 20 | 1,000 |

## Soporte

Para reportar problemas o solicitar ayuda:
- **Email**: soporte@universidad.edu
- **Documentación**: https://docs.universidad.edu/mcp-tools
- **GitHub**: https://github.com/dborra-83/educacion_connect_ia

---

*Última actualización: 2026-02-13*
