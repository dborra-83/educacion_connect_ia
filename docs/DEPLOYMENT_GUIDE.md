# Guía de Despliegue - Agente de IA MCP para Amazon Connect

## Índice
1. [Requisitos Previos](#requisitos-previos)
2. [Configuración de Infraestructura AWS](#configuración-de-infraestructura-aws)
3. [Despliegue del Código](#despliegue-del-código)
4. [Configuración de Amazon Connect](#configuración-de-amazon-connect)
5. [Verificación](#verificación)
6. [Troubleshooting](#troubleshooting)

---

## Requisitos Previos

### Herramientas Necesarias
- Node.js 18+ instalado
- AWS CLI configurado con credenciales apropiadas
- Cuenta de AWS con permisos de administrador
- Git instalado

### Permisos IAM Requeridos
El usuario/rol debe tener permisos para:
- DynamoDB (crear tablas, leer/escribir)
- Lambda (crear funciones, actualizar código)
- S3 (crear buckets, subir objetos)
- Amazon Connect (configurar instancia, flujos)
- CloudWatch (crear logs, métricas, alarmas)
- IAM (crear roles y políticas)

---

## Configuración de Infraestructura AWS

### 1. Crear Tabla DynamoDB para Perfiles

```bash
aws dynamodb create-table \
  --table-name StudentProfiles \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

#### Índices Secundarios (Opcional)

```bash
aws dynamodb update-table \
  --table-name StudentProfiles \
  --attribute-definitions \
    AttributeName=email,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{\"IndexName\":\"EmailIndex\",\"KeySchema\":[{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}}]" \
  --region us-east-1
```

### 2. Configurar S3 para Base de Conocimiento

```bash
# Crear bucket
aws s3 mb s3://educacion-knowledge-base --region us-east-1

# Configurar versionado
aws s3api put-bucket-versioning \
  --bucket educacion-knowledge-base \
  --versioning-configuration Status=Enabled

# Subir documentos de prueba
aws s3 sync ./knowledge-base-docs s3://educacion-knowledge-base/documents/
```

### 3. Crear Rol IAM para Lambda

Crear archivo `lambda-role-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/StudentProfiles"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::educacion-knowledge-base",
        "arn:aws:s3:::educacion-knowledge-base/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

Crear el rol:

```bash
# Crear rol
aws iam create-role \
  --role-name EducacionConnectAgentRole \
  --assume-role-policy-document file://lambda-trust-policy.json

# Adjuntar política
aws iam put-role-policy \
  --role-name EducacionConnectAgentRole \
  --policy-name EducacionConnectAgentPolicy \
  --policy-document file://lambda-role-policy.json
```

### 4. Configurar CloudWatch

```bash
# Crear grupo de logs
aws logs create-log-group \
  --log-group-name /aws/lambda/educacion-connect-agent \
  --region us-east-1

# Configurar retención (30 días)
aws logs put-retention-policy \
  --log-group-name /aws/lambda/educacion-connect-agent \
  --retention-in-days 30 \
  --region us-east-1
```

---

## Despliegue del Código

### 1. Preparar el Código

```bash
# Clonar repositorio
git clone https://github.com/dborra-83/educacion_connect_ia.git
cd educacion_connect_ia

# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Ejecutar tests
npm test
```

### 2. Crear Paquete de Despliegue

```bash
# Crear directorio de despliegue
mkdir -p deploy
cd deploy

# Copiar archivos compilados
cp -r ../dist/* .
cp ../package.json .
cp ../package-lock.json .

# Instalar solo dependencias de producción
npm install --production

# Crear archivo ZIP
zip -r ../educacion-connect-agent.zip .
cd ..
```

### 3. Crear Función Lambda

```bash
aws lambda create-function \
  --function-name educacion-connect-agent \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT_ID:role/EducacionConnectAgentRole \
  --handler connect/connect-handler.handler \
  --zip-file fileb://educacion-connect-agent.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables="{
    DYNAMODB_TABLE=StudentProfiles,
    S3_BUCKET=educacion-knowledge-base,
    LOG_LEVEL=INFO
  }" \
  --region us-east-1
```

### 4. Actualizar Código (Despliegues Posteriores)

```bash
# Recompilar y empaquetar
npm run build
cd deploy && zip -r ../educacion-connect-agent.zip . && cd ..

# Actualizar función
aws lambda update-function-code \
  --function-name educacion-connect-agent \
  --zip-file fileb://educacion-connect-agent.zip \
  --region us-east-1
```

---

## Configuración de Amazon Connect

### 1. Crear Instancia de Amazon Connect

```bash
aws connect create-instance \
  --identity-management-type CONNECT_MANAGED \
  --instance-alias educacion-agent \
  --inbound-calls-enabled \
  --outbound-calls-enabled \
  --region us-east-1
```

### 2. Configurar Integración con Lambda

```bash
# Obtener ARN de la instancia
INSTANCE_ARN=$(aws connect list-instances --query 'InstanceSummaryList[0].Arn' --output text)

# Dar permisos a Connect para invocar Lambda
aws lambda add-permission \
  --function-name educacion-connect-agent \
  --statement-id AllowConnectInvoke \
  --action lambda:InvokeFunction \
  --principal connect.amazonaws.com \
  --source-arn $INSTANCE_ARN \
  --region us-east-1

# Asociar Lambda con Connect
aws connect associate-lambda-function \
  --instance-id INSTANCE_ID \
  --function-arn arn:aws:lambda:us-east-1:ACCOUNT_ID:function:educacion-connect-agent \
  --region us-east-1
```

### 3. Configurar Flujo de Contacto

1. Acceder a la consola de Amazon Connect
2. Ir a "Routing" → "Contact flows"
3. Crear nuevo flujo de contacto
4. Agregar bloque "Invoke AWS Lambda function"
5. Seleccionar función `educacion-connect-agent`
6. Configurar parámetros:
   ```json
   {
     "userMessage": "$.Attributes.userMessage",
     "studentId": "$.Attributes.studentId"
   }
   ```
7. Guardar y publicar el flujo

### 4. Configurar Colas de Agentes Humanos

```bash
# Crear cola para soporte técnico
aws connect create-queue \
  --instance-id INSTANCE_ID \
  --name TechnicalSupport \
  --description "Cola para soporte técnico" \
  --hours-of-operation-id HOURS_ID \
  --region us-east-1

# Crear cola para asesores académicos
aws connect create-queue \
  --instance-id INSTANCE_ID \
  --name AcademicAdvisors \
  --description "Cola para asesores académicos" \
  --hours-of-operation-id HOURS_ID \
  --region us-east-1
```

---

## Variables de Entorno

Configurar las siguientes variables en Lambda:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DYNAMODB_TABLE` | Nombre de la tabla DynamoDB | `StudentProfiles` |
| `S3_BUCKET` | Bucket de base de conocimiento | `educacion-knowledge-base` |
| `LOG_LEVEL` | Nivel de logging | `INFO` |
| `CONNECT_INSTANCE_ARN` | ARN de la instancia Connect | `arn:aws:connect:...` |
| `AWS_REGION` | Región de AWS | `us-east-1` |

---

## Verificación

### 1. Verificar Función Lambda

```bash
# Invocar función de prueba
aws lambda invoke \
  --function-name educacion-connect-agent \
  --payload file://test-event.json \
  --region us-east-1 \
  output.json

# Ver resultado
cat output.json
```

Archivo `test-event.json`:
```json
{
  "Details": {
    "ContactData": {
      "Attributes": {
        "studentId": "STU001"
      },
      "ContactId": "test-contact-123",
      "InitialContactId": "test-initial-123",
      "Channel": "VOICE",
      "InstanceARN": "arn:aws:connect:us-east-1:123456789012:instance/test"
    },
    "Parameters": {
      "userMessage": "Hola, necesito ayuda"
    }
  },
  "Name": "ContactFlowEvent"
}
```

### 2. Verificar Logs

```bash
# Ver logs recientes
aws logs tail /aws/lambda/educacion-connect-agent --follow

# Buscar errores
aws logs filter-log-events \
  --log-group-name /aws/lambda/educacion-connect-agent \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000
```

### 3. Verificar Métricas

```bash
# Ver métricas de Lambda
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=educacion-connect-agent \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

## Troubleshooting

### Problema: Lambda Timeout

**Síntoma**: Función Lambda excede el tiempo límite

**Solución**:
```bash
aws lambda update-function-configuration \
  --function-name educacion-connect-agent \
  --timeout 60 \
  --region us-east-1
```

### Problema: Errores de Permisos

**Síntoma**: AccessDeniedException en logs

**Solución**: Verificar y actualizar política IAM
```bash
aws iam get-role-policy \
  --role-name EducacionConnectAgentRole \
  --policy-name EducacionConnectAgentPolicy
```

### Problema: DynamoDB Throttling

**Síntoma**: ProvisionedThroughputExceededException

**Solución**: Cambiar a modo on-demand o aumentar capacidad
```bash
aws dynamodb update-table \
  --table-name StudentProfiles \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

---

## Rollback

En caso de problemas, revertir a versión anterior:

```bash
# Listar versiones
aws lambda list-versions-by-function \
  --function-name educacion-connect-agent

# Revertir a versión específica
aws lambda update-alias \
  --function-name educacion-connect-agent \
  --name PROD \
  --function-version PREVIOUS_VERSION
```

---

## Checklist de Despliegue

- [ ] Infraestructura AWS creada
- [ ] Tabla DynamoDB configurada
- [ ] Bucket S3 creado y poblado
- [ ] Rol IAM creado con permisos correctos
- [ ] Función Lambda desplegada
- [ ] Variables de entorno configuradas
- [ ] Amazon Connect configurado
- [ ] Flujo de contacto publicado
- [ ] Colas de agentes creadas
- [ ] Tests de integración ejecutados
- [ ] Logs verificados
- [ ] Métricas configuradas
- [ ] Alarmas creadas
- [ ] Documentación actualizada

---

*Última actualización: 2026-02-13*
