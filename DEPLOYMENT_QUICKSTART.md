# Guía Rápida de Despliegue

Esta guía te ayudará a desplegar el Agente de IA MCP para Amazon Connect en AWS en menos de 30 minutos.

## Prerequisitos

1. **AWS CLI** instalado y configurado
   ```bash
   aws configure
   ```

2. **Node.js 18+** instalado
   ```bash
   node --version
   ```

3. **Permisos AWS** necesarios:
   - CloudFormation: Full access
   - Lambda: Full access
   - DynamoDB: Full access
   - S3: Full access
   - IAM: CreateRole, AttachRolePolicy
   - CloudWatch: Full access

## Paso 1: Compilar el Código

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Verificar que los tests pasan
npm test
```

## Paso 2: Desplegar Infraestructura

```bash
cd infrastructure

# Dar permisos de ejecución a los scripts
chmod +x deploy.sh seed-database.sh upload-knowledge-base.sh

# Desplegar stack de CloudFormation (toma ~5 minutos)
./deploy.sh dev
```

Esto creará:
- Tabla DynamoDB para perfiles de estudiantes
- Bucket S3 para base de conocimiento
- 3 funciones Lambda (vacías por ahora)
- Roles y políticas IAM
- Grupos de logs y alarmas en CloudWatch

## Paso 3: Desplegar Código Lambda

```bash
# Volver al directorio raíz
cd ..

# Crear paquete de despliegue
zip -r lambda-package.zip dist/ node_modules/ package.json

# Actualizar función principal
aws lambda update-function-code \
  --function-name dev-educacion-agent-handler \
  --zip-file fileb://lambda-package.zip \
  --region us-east-1

# Actualizar función de API académica
aws lambda update-function-code \
  --function-name dev-academic-record-api \
  --zip-file fileb://lambda-package.zip \
  --region us-east-1

# Actualizar función de generación de certificados
aws lambda update-function-code \
  --function-name dev-certificate-generation \
  --zip-file fileb://lambda-package.zip \
  --region us-east-1
```

## Paso 4: Poblar Base de Datos

```bash
cd infrastructure

# Poblar DynamoDB con datos de prueba
./seed-database.sh dev

# Subir documentos a S3
./upload-knowledge-base.sh dev
```

## Paso 5: Configurar Amazon Connect

### 5.1 Dar Permisos a Amazon Connect

```bash
aws lambda add-permission \
  --function-name dev-educacion-agent-handler \
  --statement-id AllowConnectInvoke \
  --action lambda:InvokeFunction \
  --principal connect.amazonaws.com \
  --source-arn arn:aws:connect:us-east-1:520754296204:instance/983955e0-57a9-4633-aad0-f87f18072f04 \
  --region us-east-1
```

### 5.2 Configurar Flujo de Contacto

1. Ir a la consola de Amazon Connect
2. Abrir "Routing" → "Contact flows"
3. Crear nuevo flujo de contacto
4. Agregar bloque "Invoke AWS Lambda function"
5. Seleccionar función: `dev-educacion-agent-handler`
6. Configurar parámetros de entrada:
   ```json
   {
     "studentId": "$.Attributes.studentId",
     "message": "$.StoredCustomerInput",
     "sessionId": "$.ContactId"
   }
   ```
7. Conectar bloques:
   - Entry → Set contact attributes (studentId)
   - Set attributes → Get customer input (mensaje)
   - Get input → Invoke Lambda
   - Lambda success → Play prompt (respuesta)
   - Lambda error → Transfer to queue
8. Guardar y publicar el flujo

### 5.3 Asignar Flujo a Número de Teléfono

1. Ir a "Routing" → "Phone numbers"
2. Seleccionar número de teléfono
3. Asignar el flujo de contacto creado
4. Guardar cambios

## Paso 6: Probar el Sistema

### Prueba desde AWS Console

```bash
# Invocar Lambda directamente
aws lambda invoke \
  --function-name dev-educacion-agent-handler \
  --payload '{"studentId":"STU001","message":"Hola","sessionId":"test-123"}' \
  --region us-east-1 \
  response.json

# Ver respuesta
cat response.json
```

### Prueba desde Amazon Connect

1. Llamar al número de teléfono configurado
2. Proporcionar studentId cuando se solicite
3. Hacer una consulta (ej: "¿Cuál es mi promedio?")
4. Verificar que el agente responde correctamente

## Paso 7: Monitoreo

### Ver Logs

```bash
# Logs del handler principal
aws logs tail /aws/lambda/dev-educacion-agent-handler --follow --region us-east-1

# Logs de API académica
aws logs tail /aws/lambda/dev-academic-record-api --follow --region us-east-1

# Logs de generación de certificados
aws logs tail /aws/lambda/dev-certificate-generation --follow --region us-east-1
```

### Ver Métricas

1. Ir a CloudWatch → Dashboards
2. Crear dashboard personalizado
3. Agregar widgets para:
   - Invocaciones de Lambda
   - Errores
   - Duración
   - Métricas personalizadas (ErrorRate, ResponseTime, etc.)

## Troubleshooting

### Error: "Stack already exists"

Si el stack ya existe, actualízalo en lugar de crearlo:

```bash
aws cloudformation update-stack \
  --stack-name educacion-connect-ia-dev \
  --template-body file://cloudformation-template.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Error: "Function code too large"

Si el paquete es muy grande, usa S3:

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

### Error: "Access Denied"

Verifica que tu usuario IAM tenga los permisos necesarios:

```bash
# Ver identidad actual
aws sts get-caller-identity

# Verificar permisos
aws iam get-user-policy --user-name YOUR_USERNAME --policy-name YOUR_POLICY
```

### Lambda no responde

1. Verificar logs en CloudWatch
2. Verificar variables de entorno
3. Verificar permisos IAM del rol de Lambda
4. Verificar timeout (debe ser al menos 30 segundos)

## Limpieza

Para eliminar toda la infraestructura:

```bash
# Vaciar bucket S3
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws s3 rm s3://dev-educacion-knowledge-base-${ACCOUNT_ID} --recursive --region us-east-1

# Eliminar stack
aws cloudformation delete-stack \
  --stack-name educacion-connect-ia-dev \
  --region us-east-1

# Verificar eliminación
aws cloudformation describe-stacks \
  --stack-name educacion-connect-ia-dev \
  --region us-east-1
```

## Próximos Pasos

1. **Staging**: Desplegar en ambiente de staging con `./deploy.sh staging`
2. **Producción**: Desplegar en producción con `./deploy.sh prod`
3. **Monitoreo**: Configurar alarmas y dashboards
4. **Optimización**: Ajustar memoria y timeout de Lambda según uso real
5. **Escalamiento**: Configurar auto-scaling para DynamoDB si es necesario

## Soporte

- **Documentación completa**: Ver `infrastructure/README.md`
- **Guía de operación**: Ver `docs/OPERATIONS_GUIDE.md`
- **Documentación de API**: Ver `docs/API_DOCUMENTATION.md`
- **Repositorio**: https://github.com/dborra-83/educacion_connect_ia

## Costos Estimados

Para ambiente de desarrollo con uso moderado:
- DynamoDB: $5-10/mes
- Lambda: $5-15/mes
- S3: $0.23/mes
- CloudWatch: $5.50/mes

**Total: ~$15-30/mes**

---

¡Listo! Tu agente de IA está desplegado y funcionando en AWS.
