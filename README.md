# Agente de IA MCP para Amazon Connect - Educación Superior

Sistema de inteligencia artificial basado en el Protocolo de Contexto de Modelo (MCP) integrado con Amazon Connect, diseñado específicamente para instituciones de educación superior.

## Características Principales

- 👋 **Atención Personalizada**: Integración con perfiles unificados (CRM + LMS)
- ❓ **Respuestas Inteligentes**: Consultas a bases de conocimiento sobre programas académicos
- 🧠 **Asistencia Proactiva**: Análisis de historial académico y recomendaciones personalizadas
- 🚀 **Automatización de Trámites**: Generación de certificados y gestión de procesos administrativos
- 🔒 **Seguridad y Auditoría**: Autenticación, control de acceso y registro de auditoría
- 🛡️ **Manejo Robusto de Errores**: Traducción de errores técnicos y alternativas ante fallos

## Estructura del Proyecto

```
src/
├── types/          # Interfaces y tipos TypeScript
├── tools/          # Herramientas MCP (getStudentProfile, queryKnowledgeBase, etc.)
├── agent/          # Lógica del agente y motor de razonamiento
├── connect/        # Integración con Amazon Connect
├── security/       # Autenticación, control de acceso y auditoría
├── utils/          # Utilidades y helpers
├── config/         # Configuración AWS
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

El sistema implementa 4 herramientas MCP principales:

### getStudentProfile
Recupera el perfil unificado del estudiante desde DynamoDB (CRM + LMS).

### queryKnowledgeBase
Busca información en la base de conocimiento sobre programas, requisitos y procedimientos.

### checkAcademicRecord
Consulta el historial académico del estudiante (calificaciones, materias, alertas).

### generateCertificate
Genera y envía certificados académicos con validación de requisitos.

Para más detalles, consulta la [Documentación de API](docs/API_DOCUMENTATION.md).

## Configuración AWS

El sistema requiere los siguientes servicios AWS:
- **Amazon Connect**: Instancia ARN `arn:aws:connect:us-east-1:520754296204:instance/983955e0-57a9-4633-aad0-f87f18072f04`
- **DynamoDB**: Perfiles unificados de estudiantes
- **Amazon Kendra o S3**: Base de conocimiento académica
- **AWS Lambda**: APIs académicas y generación de certificados
- **CloudWatch**: Logs, métricas y monitoreo

Para instrucciones detalladas de despliegue, consulta la [Guía de Despliegue](docs/DEPLOYMENT_GUIDE.md).

## Estado del Proyecto

El proyecto está completamente implementado con:
- ✅ 291 tests unitarios pasando (100% de cobertura funcional)
- ✅ Todas las herramientas MCP implementadas
- ✅ Motor de razonamiento completo
- ✅ Integración con Amazon Connect
- ✅ Capa de seguridad y auditoría
- ✅ Manejo robusto de errores
- ✅ Documentación completa

Para más detalles, consulta [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Documentación

### Especificaciones
- [Requisitos](.kiro/specs/amazon-connect-education-agent/requirements.md)
- [Diseño](.kiro/specs/amazon-connect-education-agent/design.md)
- [Plan de Implementación](.kiro/specs/amazon-connect-education-agent/tasks.md)

### Guías Operacionales
- [Documentación de API](docs/API_DOCUMENTATION.md)
- [Guía de Despliegue](docs/DEPLOYMENT_GUIDE.md)
- [Guía de Operación](docs/OPERATIONS_GUIDE.md)

## Licencia

MIT
