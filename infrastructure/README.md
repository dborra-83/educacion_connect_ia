# Infraestructura AWS - Agente de IA MCP para Amazon Connect

Este directorio contiene los archivos necesarios para desplegar la infraestructura AWS del proyecto.

## Contenido

- `cloudformation-template.yaml`: Template de CloudFormation con toda la infraestructura
- `deploy.sh`: Script para desplegar el stack de CloudFormation
- `seed-data.json`: Datos de prueba para poblar las tablas
- `seed-database.sh`: Script para poblar DynamoDB con datos de prueba
- `upload-knowledge-base.sh`: Script para subir documentos a S3

## Prerequisitos

1. AWS CLI instalado y configurado
2. Credenciales AWS con permisos suficientes
3. Node.js 18+ instalado
4. Código compilado en `dist/`

## Despliegue

### 1. Compilar el código

```bash
npm run build
```

### 2. Desplegar infraestructura

```bash
cd infrastructure
chmod +x deploy.sh
./deploy.sh dev
```

Esto creará:
- Tabla DynamoDB para perfiles de estudiantes
- Bucket S3 para base de conocimiento
- 3 funciones Lambda (handler principal, API académica, generación de certificados)
- Roles y políticas IAM
- Grupos de logs en CloudWatch
- Alarmas de CloudWatch

### 3. Poblar base de datos

```bash
chmod +x seed-database.sh
./seed-database.sh dev
```

### 4. Subir documentos a base de conocimiento

```bash
chmod +x upload-knowledge-base.sh
./upload-knowledge-base.sh dev
```

### 5. Desplegar código Lambda

```bash
# Empaquetar código
cd ..
npm run build
zip -r lambda-package.zip dist/ node_modules/ package.json

# Actualizar funciones Lambda
aws lambda update-function-code \
  --function-name dev-educacion-agent-handler \
  --zip-file fileb://lambda-package.zip \
  --region us-east-1

aws lambda update-function-code \
  --function-name dev-academic-record-api \
  --zip-file fileb://lambda-package.zip \
  --region us-east-1

aws lambda update-function-code \
  --function-name dev-certificate-generation \
  --zip-file fileb://lambda-package.zip \
  --region us-east-1
```

## Configuración de Amazon Connect

### 1. Dar permisos a Amazon Connect para invocar Lambda

```bash
aws lambda add-permission \
  --function-name dev-educacion-agent-handler \
  --statement-id AllowConnectInvoke \
  --action lambda:InvokeFunction \
  --principal connect.amazonaws.com \
  --source-arn arn:aws:connect:us-east-1:520754296204:instance/983955e0-57a9-4633-aad0-f87f18072f04 \
  --region us-east-1
```

### 2. Configurar flujo de contacto en Amazon Connect

1. Ir a la consola de Amazon Connect
2. Crear un nuevo flujo de contacto
3. Agregar bloque "Invoke AWS Lambda function"
4. Seleccionar la función `dev-educacion-agent-handler`
5. Configurar parámetros de entrada:
   ```json
   {
     "studentId": "$.Attributes.studentId",
     "message": "$.StoredCustomerInput",
     "sessionId": "$.ContactId"
   }
   ```
6. Guardar y publicar el flujo

### 3. Configurar cola de transferencia a agentes humanos

1. Crear cola "Soporte Académico"
2. Asignar agentes humanos a la cola
3. Configurar horarios de atención
4. Actualizar flujo de contacto para transferir a esta cola cuando sea necesario

## Ambientes

El proyecto soporta 3 ambientes:

- `dev`: Desarrollo
- `staging`: Pruebas
- `prod`: Producción

Para desplegar en otro ambiente:

```bash
./deploy.sh staging
./seed-database.sh staging
./upload-knowledge-base.sh staging
```

## Monitoreo

### CloudWatch Logs

Los logs se encuentran en:
- `/aws/lambda/dev-educacion-agent-handler`
- `/aws/lambda/dev-academic-record-api`
- `/aws/lambda/dev-certificate-generation`

### CloudWatch Metrics

Métricas personalizadas:
- `ErrorRate`: Tasa de errores
- `ResponseTime`: Tiempo de respuesta
- `EscalationRate`: Tasa de escalamiento a agentes humanos
- `ToolUsage`: Uso de herramientas MCP
- `IntentDetection`: Detección de intenciones

### Alarmas

Se crean alarmas automáticas para:
- Errores en Lambda (> 5 errores en 5 minutos)
- Alta latencia (> 25 segundos promedio)

## Limpieza

Para eliminar toda la infraestructura:

```bash
# Vaciar bucket S3 primero
aws s3 rm s3://dev-educacion-knowledge-base-${ACCOUNT_ID} --recursive --region us-east-1

# Eliminar stack
aws cloudformation delete-stack \
  --stack-name educacion-connect-ia-dev \
  --region us-east-1
```

## Troubleshooting

### Error: Stack already exists

Si el stack ya existe y quieres actualizarlo, usa:

```bash
aws cloudformation update-stack \
  --stack-name educacion-connect-ia-dev \
  --template-body file://cloudformation-template.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Error: Insufficient permissions

Asegúrate de que tu usuario IAM tenga los siguientes permisos:
- CloudFormation: Full access
- Lambda: Full access
- DynamoDB: Full access
- S3: Full access
- IAM: CreateRole, AttachRolePolicy
- CloudWatch: PutMetricAlarm, CreateLogGroup

### Error: Function code too large

Si el código es muy grande, usa S3 para el despliegue:

```bash
# Subir a S3
aws s3 cp lambda-package.zip s3://my-deployment-bucket/lambda-package.zip

# Actualizar desde S3
aws lambda update-function-code \
  --function-name dev-educacion-agent-handler \
  --s3-bucket my-deployment-bucket \
  --s3-key lambda-package.zip \
  --region us-east-1
```

## Costos Estimados

Costos mensuales aproximados (ambiente dev con uso moderado):

- DynamoDB (PAY_PER_REQUEST): $5-10
- Lambda (512MB, 1000 invocaciones/día): $5-15
- S3 (10GB almacenamiento): $0.23
- CloudWatch Logs (5GB/mes): $2.50
- CloudWatch Metrics: $3

**Total estimado: $15-30/mes**

Para producción, considera usar:
- DynamoDB con capacidad provisionada
- Lambda con Provisioned Concurrency
- S3 con Intelligent-Tiering
