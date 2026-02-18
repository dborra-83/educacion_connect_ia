# 🚀 Guía de Despliegue en Producción

## Fecha: 2026-02-18
## Ambiente: Producción (prod)
## Región: us-east-1
## Cuenta AWS: 520754296204

---

## ✅ Pre-requisitos Verificados

- [x] AWS CLI configurado
- [x] Credenciales AWS activas (usuario: diego.borra@cloudhesive.com)
- [x] Código compilado exitosamente
- [x] 291 tests pasando (100%)
- [x] Repositorio GitHub actualizado

---

## 📋 Plan de Despliegue

### Fase 1: Preparación del Código (5 min)
1. Compilar código TypeScript
2. Crear paquete de despliegue
3. Verificar integridad del paquete

### Fase 2: Despliegue de Infraestructura (10-15 min)
1. Validar template de CloudFormation
2. Desplegar stack de infraestructura
3. Verificar recursos creados

### Fase 3: Despliegue de Código Lambda (5 min)
1. Subir paquete a S3 (si es necesario)
2. Actualizar funciones Lambda
3. Verificar versiones desplegadas

### Fase 4: Poblar Datos Iniciales (5 min)
1. Poblar DynamoDB con datos de prueba
2. Subir documentos a S3
3. Verificar datos cargados

### Fase 5: Configuración de Amazon Connect (10 min)
1. Dar permisos a Lambda
2. Configurar flujo de contacto
3. Asignar flujo a número de teléfono

### Fase 6: Verificación y Pruebas (10 min)
1. Invocar Lambda directamente
2. Verificar logs en CloudWatch
3. Realizar prueba end-to-end
4. Configurar alarmas

**Tiempo Total Estimado: 45-50 minutos**

---

## 🔧 Comandos de Despliegue

### Paso 1: Preparar Código

```powershell
# Compilar TypeScript
npm run build

# Crear paquete de despliegue
Compress-Archive -Path dist\*,node_modules\*,package.json -DestinationPath lambda-package.zip -Force
```

### Paso 2: Desplegar Infraestructura

```powershell
# Cambiar a directorio de infraestructura
cd infrastructure

# Validar template
aws cloudformation validate-template `
  --template-body file://cloudformation-template.yaml `
  --region us-east-1

# Desplegar stack
aws cloudformation deploy `
  --template-file cloudformation-template.yaml `
  --stack-name educacion-connect-ia-prod `
  --parameter-overrides Environment=prod `
  --capabilities CAPABILITY_NAMED_IAM `
  --region us-east-1 `
  --tags Environment=prod Application=EducacionConnectIA ManagedBy=CloudFormation

# Obtener outputs
aws cloudformation describe-stacks `
  --stack-name educacion-connect-ia-prod `
  --region us-east-1 `
  --query 'Stacks[0].Outputs' `
  --output table
```

### Paso 3: Desplegar Código Lambda

```powershell
# Volver al directorio raíz
cd ..

# Actualizar función principal
aws lambda update-function-code `
  --function-name prod-educacion-agent-handler `
  --zip-file fileb://lambda-package.zip `
  --region us-east-1

# Actualizar función de API académica
aws lambda update-function-code `
  --function-name prod-academic-record-api `
  --zip-file fileb://lambda-package.zip `
  --region us-east-1

# Actualizar función de generación de certificados
aws lambda update-function-code `
  --function-name prod-certificate-generation `
  --zip-file fileb://lambda-package.zip `
  --region us-east-1

# Publicar versiones
aws lambda publish-version `
  --function-name prod-educacion-agent-handler `
  --description "Production deployment $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" `
  --region us-east-1
```

### Paso 4: Poblar Datos

```powershell
cd infrastructure

# Poblar DynamoDB
.\seed-database.sh prod

# Subir documentos a S3
.\upload-knowledge-base.sh prod
```

### Paso 5: Configurar Amazon Connect

```powershell
# Dar permisos a Amazon Connect
aws lambda add-permission `
  --function-name prod-educacion-agent-handler `
  --statement-id AllowConnectInvoke `
  --action lambda:InvokeFunction `
  --principal connect.amazonaws.com `
  --source-arn arn:aws:connect:us-east-1:520754296204:instance/983955e0-57a9-4633-aad0-f87f18072f04 `
  --region us-east-1
```

### Paso 6: Verificación

```powershell
# Invocar Lambda de prueba
$payload = @{
    studentId = "STU001"
    message = "Hola, necesito ayuda"
    sessionId = "test-prod-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

$payload | Out-File -FilePath test-payload.json -Encoding utf8

aws lambda invoke `
  --function-name prod-educacion-agent-handler `
  --payload file://test-payload.json `
  --region us-east-1 `
  response.json

# Ver respuesta
Get-Content response.json | ConvertFrom-Json | ConvertTo-Json -Depth 10

# Ver logs
aws logs tail /aws/lambda/prod-educacion-agent-handler --follow --region us-east-1
```

---

## 📊 Recursos Creados

### DynamoDB
- **Tabla**: `prod-StudentProfiles`
- **Modo**: PAY_PER_REQUEST (on-demand)
- **Índices**: EmailIndex (GSI)

### S3
- **Bucket**: `prod-educacion-knowledge-base-520754296204`
- **Versionado**: Habilitado
- **Encriptación**: AES256

### Lambda
1. **prod-educacion-agent-handler**
   - Runtime: Node.js 18.x
   - Memoria: 512 MB
   - Timeout: 30 segundos
   - Handler: connect/connect-handler.handler

2. **prod-academic-record-api**
   - Runtime: Node.js 18.x
   - Memoria: 256 MB
   - Timeout: 15 segundos
   - Handler: lambdas/academic-record.handler

3. **prod-certificate-generation**
   - Runtime: Node.js 18.x
   - Memoria: 256 MB
   - Timeout: 20 segundos
   - Handler: lambdas/certificate-generation.handler

### IAM
- **Rol**: `prod-EducacionAgentRole`
- **Políticas**: DynamoDB, S3, CloudWatch, Lambda

### CloudWatch
- **Log Groups**: 
  - `/aws/lambda/prod-educacion-agent-handler`
  - `/aws/lambda/prod-academic-record-api`
  - `/aws/lambda/prod-certificate-generation`
- **Retención**: 30 días
- **Métricas personalizadas**: Namespace `AmazonConnect/EducationAgent`

---

## 🔍 Verificación Post-Despliegue

### Checklist de Verificación

- [ ] Stack de CloudFormation desplegado exitosamente
- [ ] Tabla DynamoDB creada y accesible
- [ ] Bucket S3 creado y poblado con documentos
- [ ] 3 funciones Lambda desplegadas y actualizadas
- [ ] Roles IAM creados con permisos correctos
- [ ] Log groups de CloudWatch creados
- [ ] Permisos de Amazon Connect configurados
- [ ] Datos de prueba cargados en DynamoDB
- [ ] Documentos subidos a S3
- [ ] Lambda responde correctamente a invocaciones de prueba
- [ ] Logs aparecen en CloudWatch
- [ ] Métricas se publican correctamente

### Comandos de Verificación

```powershell
# Verificar stack
aws cloudformation describe-stacks `
  --stack-name educacion-connect-ia-prod `
  --region us-east-1 `
  --query 'Stacks[0].StackStatus'

# Verificar tabla DynamoDB
aws dynamodb describe-table `
  --table-name prod-StudentProfiles `
  --region us-east-1 `
  --query 'Table.[TableName,TableStatus,ItemCount]'

# Verificar bucket S3
aws s3 ls s3://prod-educacion-knowledge-base-520754296204/

# Verificar funciones Lambda
aws lambda list-functions `
  --region us-east-1 `
  --query 'Functions[?starts_with(FunctionName, `prod-educacion`)].FunctionName'

# Verificar logs
aws logs describe-log-groups `
  --log-group-name-prefix /aws/lambda/prod-educacion `
  --region us-east-1
```

---

## 🚨 Alarmas y Monitoreo

### Alarmas Críticas a Configurar

```powershell
# Alarma de alta tasa de error
aws cloudwatch put-metric-alarm `
  --alarm-name prod-educacion-agent-high-error-rate `
  --alarm-description "Tasa de error superior al 5% en producción" `
  --metric-name Errors `
  --namespace AWS/Lambda `
  --statistic Sum `
  --period 300 `
  --threshold 5 `
  --comparison-operator GreaterThanThreshold `
  --evaluation-periods 2 `
  --dimensions Name=FunctionName,Value=prod-educacion-agent-handler `
  --region us-east-1

# Alarma de tiempo de respuesta alto
aws cloudwatch put-metric-alarm `
  --alarm-name prod-educacion-agent-slow-response `
  --alarm-description "Tiempo de respuesta superior a 10 segundos" `
  --metric-name Duration `
  --namespace AWS/Lambda `
  --statistic Average `
  --period 300 `
  --threshold 10000 `
  --comparison-operator GreaterThanThreshold `
  --evaluation-periods 2 `
  --dimensions Name=FunctionName,Value=prod-educacion-agent-handler `
  --region us-east-1

# Alarma de throttling
aws cloudwatch put-metric-alarm `
  --alarm-name prod-educacion-agent-throttling `
  --alarm-description "Invocaciones limitadas detectadas" `
  --metric-name Throttles `
  --namespace AWS/Lambda `
  --statistic Sum `
  --period 300 `
  --threshold 10 `
  --comparison-operator GreaterThanThreshold `
  --evaluation-periods 1 `
  --dimensions Name=FunctionName,Value=prod-educacion-agent-handler `
  --region us-east-1
```

---

## 🔄 Rollback Plan

En caso de problemas críticos:

```powershell
# Opción 1: Revertir a versión anterior de Lambda
aws lambda update-alias `
  --function-name prod-educacion-agent-handler `
  --name PROD `
  --function-version PREVIOUS_VERSION `
  --region us-east-1

# Opción 2: Eliminar stack completo (CUIDADO: Elimina todos los recursos)
aws cloudformation delete-stack `
  --stack-name educacion-connect-ia-prod `
  --region us-east-1

# Opción 3: Actualizar stack con versión anterior
aws cloudformation update-stack `
  --stack-name educacion-connect-ia-prod `
  --template-body file://cloudformation-template-previous.yaml `
  --capabilities CAPABILITY_NAMED_IAM `
  --region us-east-1
```

---

## 📞 Contactos de Emergencia

- **Líder Técnico**: Diego Borra (diego.borra@cloudhesive.com)
- **AWS Support**: Caso de soporte en consola AWS
- **Repositorio**: https://github.com/dborra-83/educacion_connect_ia

---

## 📝 Notas Importantes

1. **Costos Estimados de Producción**:
   - DynamoDB (on-demand): $10-30/mes
   - Lambda: $20-50/mes
   - S3: $1-5/mes
   - CloudWatch: $10-20/mes
   - **Total estimado**: $40-100/mes

2. **Límites de Servicio**:
   - Lambda concurrencia: 1000 (default)
   - DynamoDB: Sin límite (on-demand)
   - S3: Sin límite

3. **Seguridad**:
   - Todos los recursos usan encriptación en reposo
   - Comunicación HTTPS/TLS
   - Roles IAM con principio de mínimo privilegio
   - Auditoría completa habilitada

4. **Backup**:
   - DynamoDB: Point-in-time recovery habilitado
   - S3: Versionado habilitado
   - Lambda: Versiones publicadas

---

## ✅ Estado del Despliegue

- **Fecha de inicio**: 2026-02-18
- **Estado**: PENDIENTE DE EJECUCIÓN
- **Responsable**: Diego Borra
- **Aprobado por**: [Pendiente]

---

*Este documento debe actualizarse después de cada despliegue con los resultados reales.*

