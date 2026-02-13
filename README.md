# Agente de IA MCP para Amazon Connect - Educación Superior

Sistema de inteligencia artificial basado en el Protocolo de Contexto de Modelo (MCP) integrado con Amazon Connect, diseñado específicamente para instituciones de educación superior.

## Características Principales

- 👋 **Atención Personalizada**: Integración con perfiles unificados (CRM + LMS)
- ❓ **Respuestas Inteligentes**: Consultas a bases de conocimiento sobre programas académicos
- 🧠 **Asistencia Proactiva**: Análisis de historial académico y recomendaciones personalizadas
- 🚀 **Automatización de Trámites**: Generación de certificados y gestión de procesos administrativos

## Estructura del Proyecto

```
src/
├── types/          # Interfaces y tipos TypeScript
├── tools/          # Herramientas MCP (getStudentProfile, queryKnowledgeBase, etc.)
├── agent/          # Lógica del agente y motor de razonamiento
├── utils/          # Utilidades y helpers
└── index.ts        # Punto de entrada
```

## Instalación

```bash
npm install
```

## Desarrollo

```bash
# Compilar TypeScript
npm run build

# Ejecutar tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Verificar cobertura
npm run test:coverage

# Linting
npm run lint
npm run lint:fix

# Formateo de código
npm run format
npm run format:check
```

## Herramientas MCP

### getStudentProfile
Recupera el perfil unificado del estudiante desde DynamoDB (CRM + LMS).

### queryKnowledgeBase
Busca información en la base de conocimiento sobre programas, requisitos y procedimientos.

### checkAcademicRecord
Consulta el historial académico del estudiante (calificaciones, materias, alertas).

### generateCertificate
Genera y envía certificados académicos con validación de requisitos.

## Configuración AWS

El sistema requiere los siguientes servicios AWS:
- Amazon Connect (instancia: ch-latam-educacion.my.connect.aws)
- DynamoDB (perfiles unificados)
- Amazon Kendra o S3 (base de conocimiento)
- AWS Lambda (APIs académicas y generación de certificados)
- CloudWatch (logs y métricas)

## Documentación

Para más detalles, consulta:
- [Requisitos](.kiro/specs/amazon-connect-education-agent/requirements.md)
- [Diseño](.kiro/specs/amazon-connect-education-agent/design.md)
- [Plan de Implementación](.kiro/specs/amazon-connect-education-agent/tasks.md)

## Licencia

MIT
