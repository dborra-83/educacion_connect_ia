# Guía de Operación - Agente de IA MCP para Amazon Connect

## Índice
1. [Monitoreo](#monitoreo)
2. [Alertas](#alertas)
3. [Troubleshooting](#troubleshooting)
4. [Mantenimiento](#mantenimiento)
5. [Procedimientos de Emergencia](#procedimientos-de-emergencia)

---

## Monitoreo

### Dashboard de CloudWatch

Acceder al dashboard principal:
```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=EducacionConnectAgent
```

#### Métricas Clave

| Métrica | Descripción | Umbral Normal | Umbral Crítico |
|---------|-------------|---------------|----------------|
| `Invocations` | Llamadas a Lambda | < 1000/min | > 2000/min |
| `Errors` | Errores en Lambda | < 1% | > 5% |
| `Duration` | Tiempo de ejecución | < 5s | > 10s |
| `Throttles` | Invocaciones limitadas | 0 | > 10 |
| `ErrorRate` | Tasa de error del agente | < 2% | > 10% |
| `EscalationRate` | Tasa de escalamiento | < 5% | > 20% |
| `ResponseTime` | Tiempo de respuesta | < 3s | > 8s |

### Consultas de CloudWatch Insights

#### Ver Errores Recientes
```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50
```

#### Analizar Tiempos de Respuesta
```
fields @timestamp, metadata.processingTime
| filter @message like /Interacción completa registrada/
| stats avg(metadata.processingTime), max(metadata.processingTime), min(metadata.processingTime) by bin(5m)
```

#### Identificar Estudiantes con Problemas
```
fields @timestamp, studentId, @message
| filter requiresEscalation = true
| stats count() by studentId
| sort count() desc
```

#### Monitorear Uso de Herramientas
```
fields @timestamp, toolsUsed
| filter @message like /Interacción completa registrada/
| stats count() by toolsUsed
```

### Métricas Personalizadas

#### Ver Tasa de Escalamiento
```bash
aws cloudwatch get-metric-statistics \
  --namespace AmazonConnect/EducationAgent \
  --metric-name EscalationRate \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum \
  --region us-east-1
```

#### Ver Tiempo de Respuesta Promedio
```bash
aws cloudwatch get-metric-statistics \
  --namespace AmazonConnect/EducationAgent \
  --metric-name ResponseTime \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,p99 \
  --region us-east-1
```

---

## Alertas

### Configuración de Alarmas

#### Alarma de Alta Tasa de Error

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name educacion-agent-high-error-rate \
  --alarm-description "Tasa de error superior al 5%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=FunctionName,Value=educacion-connect-agent \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:ops-alerts \
  --region us-east-1
```

#### Alarma de Tiempo de Respuesta Alto

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name educacion-agent-slow-response \
  --alarm-description "Tiempo de respuesta superior a 8 segundos" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --statistic Average \
  --period 300 \
  --threshold 8000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=FunctionName,Value=educacion-connect-agent \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:ops-alerts \
  --region us-east-1
```

#### Alarma de Alta Tasa de Escalamiento

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name educacion-agent-high-escalation \
  --alarm-description "Tasa de escalamiento superior al 20%" \
  --metric-name EscalationRate \
  --namespace AmazonConnect/EducationAgent \
  --statistic Average \
  --period 300 \
  --threshold 20 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:ops-alerts \
  --region us-east-1
```

### Notificaciones

Las alarmas envían notificaciones a:
- **Email**: ops-team@universidad.edu
- **Slack**: #educacion-connect-alerts
- **PagerDuty**: Para alarmas críticas

---

## Troubleshooting

### Problema: Alta Tasa de Errores

#### Diagnóstico
```bash
# Ver errores recientes
aws logs tail /aws/lambda/educacion-connect-agent \
  --filter-pattern "ERROR" \
  --since 1h

# Analizar tipos de error
aws logs filter-log-events \
  --log-group-name /aws/lambda/educacion-connect-agent \
  --filter-pattern "{ $.level = \"ERROR\" }" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  | jq '.events[].message | fromjson | .error'
```

#### Soluciones Comunes

1. **Error de DynamoDB**
   - Verificar capacidad de la tabla
   - Revisar permisos IAM
   - Verificar conectividad de red

2. **Error de S3**
   - Verificar que el bucket existe
   - Revisar permisos de lectura
   - Verificar que los documentos existen

3. **Timeout de Lambda**
   - Aumentar timeout de la función
   - Optimizar código
   - Revisar llamadas a servicios externos

### Problema: Respuestas Lentas

#### Diagnóstico
```bash
# Analizar tiempos de ejecución
aws logs insights query \
  --log-group-name /aws/lambda/educacion-connect-agent \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @duration | stats avg(@duration), max(@duration), p99(@duration)'
```

#### Soluciones

1. **Aumentar memoria de Lambda**
   ```bash
   aws lambda update-function-configuration \
     --function-name educacion-connect-agent \
     --memory-size 1024
   ```

2. **Optimizar consultas a DynamoDB**
   - Usar índices secundarios
   - Implementar caché
   - Reducir tamaño de respuestas

3. **Implementar caché de perfiles**
   - Ya implementado en código
   - Verificar que funciona correctamente

### Problema: Sesiones Bloqueadas Incorrectamente

#### Diagnóstico
```bash
# Ver sesiones bloqueadas
aws logs filter-log-events \
  --log-group-name /aws/lambda/educacion-connect-agent \
  --filter-pattern "Sesión bloqueada" \
  --start-time $(date -d '1 hour ago' +%s)000
```

#### Solución
```typescript
// Desbloquear sesión manualmente
import { AccessControl } from './security/access-control';

AccessControl.unblockSession('session-id');
```

### Problema: Certificados No Se Generan

#### Diagnóstico
1. Verificar logs de generación
2. Verificar estado financiero del estudiante
3. Verificar permisos de Lambda

#### Solución
```bash
# Ver logs específicos de certificados
aws logs filter-log-events \
  --log-group-name /aws/lambda/educacion-connect-agent \
  --filter-pattern "certificado" \
  --start-time $(date -d '1 hour ago' +%s)000
```

---

## Mantenimiento

### Actualizaciones de Código

#### Proceso de Actualización

1. **Preparar nueva versión**
   ```bash
   git pull origin main
   npm install
   npm test
   npm run build
   ```

2. **Crear versión en Lambda**
   ```bash
   aws lambda publish-version \
     --function-name educacion-connect-agent \
     --description "Version $(date +%Y%m%d-%H%M%S)"
   ```

3. **Actualizar alias PROD gradualmente**
   ```bash
   # 10% de tráfico a nueva versión
   aws lambda update-alias \
     --function-name educacion-connect-agent \
     --name PROD \
     --function-version NEW_VERSION \
     --routing-config AdditionalVersionWeights={CURRENT_VERSION=0.9}
   
   # Monitorear por 30 minutos
   
   # Si todo está bien, 100% a nueva versión
   aws lambda update-alias \
     --function-name educacion-connect-agent \
     --name PROD \
     --function-version NEW_VERSION
   ```

### Limpieza de Logs

```bash
# Configurar retención de 30 días
aws logs put-retention-policy \
  --log-group-name /aws/lambda/educacion-connect-agent \
  --retention-in-days 30

# Eliminar logs antiguos manualmente
aws logs delete-log-stream \
  --log-group-name /aws/lambda/educacion-connect-agent \
  --log-stream-name OLD_STREAM_NAME
```

### Limpieza de Sesiones Expiradas

El sistema limpia automáticamente sesiones expiradas, pero se puede ejecutar manualmente:

```typescript
import { ConversationManager } from './agent/conversation-manager';
import { AccessControl } from './security/access-control';

// Limpiar sesiones de conversación expiradas
ConversationManager.cleanupExpiredSessions();

// Limpiar bloqueos de seguridad expirados
AccessControl.cleanupExpiredBlocks();
```

### Backup de Datos

```bash
# Backup de tabla DynamoDB
aws dynamodb create-backup \
  --table-name StudentProfiles \
  --backup-name StudentProfiles-$(date +%Y%m%d)

# Backup de bucket S3
aws s3 sync s3://educacion-knowledge-base s3://educacion-knowledge-base-backup/$(date +%Y%m%d)/
```

---

## Procedimientos de Emergencia

### Escenario 1: Sistema Completamente Caído

#### Acciones Inmediatas
1. Verificar estado de servicios AWS
2. Revisar logs de errores
3. Activar plan de contingencia

#### Plan de Contingencia
```bash
# Revertir a última versión estable
aws lambda update-alias \
  --function-name educacion-connect-agent \
  --name PROD \
  --function-version LAST_STABLE_VERSION

# Notificar al equipo
# Activar modo de mantenimiento en Amazon Connect
```

### Escenario 2: Alta Carga Inesperada

#### Acciones
1. Aumentar concurrencia de Lambda
   ```bash
   aws lambda put-function-concurrency \
     --function-name educacion-connect-agent \
     --reserved-concurrent-executions 100
   ```

2. Escalar DynamoDB
   ```bash
   aws dynamodb update-table \
     --table-name StudentProfiles \
     --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=50
   ```

3. Activar caché agresivo

### Escenario 3: Brecha de Seguridad

#### Acciones Inmediatas
1. Bloquear acceso sospechoso
2. Revisar logs de auditoría
3. Notificar al equipo de seguridad

```bash
# Ver intentos de acceso no autorizado
aws logs filter-log-events \
  --log-group-name /aws/lambda/educacion-connect-agent \
  --filter-pattern "UNAUTHORIZED_ACCESS_ATTEMPT" \
  --start-time $(date -d '24 hours ago' +%s)000
```

4. Rotar credenciales si es necesario
5. Actualizar políticas de seguridad

---

## Contactos de Emergencia

| Rol | Nombre | Contacto | Horario |
|-----|--------|----------|---------|
| Líder Técnico | [Nombre] | [Email/Teléfono] | 24/7 |
| DevOps | [Nombre] | [Email/Teléfono] | 24/7 |
| Seguridad | [Nombre] | [Email/Teléfono] | 24/7 |
| Soporte AWS | AWS Support | [Caso] | 24/7 |

---

## Checklist de Operación Diaria

- [ ] Revisar dashboard de métricas
- [ ] Verificar alarmas activas
- [ ] Revisar logs de errores
- [ ] Verificar tasa de escalamiento
- [ ] Revisar logs de seguridad
- [ ] Verificar backups
- [ ] Revisar capacidad de servicios
- [ ] Actualizar documentación si es necesario

---

*Última actualización: 2026-02-13*
