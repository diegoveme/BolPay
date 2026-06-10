# Plataforma Freelance Trustless — Resumen del Proyecto

## ¿Qué es?

Plataforma web y móvil para gestionar contratos freelance, pagos internacionales y nómina periódica entre empresas y trabajadores remotos, utilizando escrow descentralizado sobre la red Stellar con integración de Trustless Work. Todos los pagos se realizan en USDC, garantizando estabilidad de valor y trazabilidad on-chain de cada operación.

---

## Problema que resuelve

- Empresas y freelancers gestionan acuerdos por correo, WhatsApp o Telegram sin garantías formales
- Los pagos se realizan manualmente vía PayPal con retrasos y sin trazabilidad
- No existe una herramienta centralizada para contratos, milestones y pagos con escrow real
- Las empresas con equipos fijos carecen de un sistema de nómina automatizado y transparente

---

## Roles del sistema

| Rol | Descripción |
|---|---|
| **Empresa** | Crea contratos, gestiona milestones, aprueba entregables, administra payroll |
| **Freelancer** | Acepta contratos, sube entregables, recibe pagos por milestone |
| **Empleado Fijo** | Recibe pagos periódicos vía módulo de payroll |
| **Administrador** | Supervisa la plataforma, resuelve disputas escaladas, monitorea escrows |

---

## Módulos del sistema

### 1. Gestión de Usuarios
- Registro y autenticación por rol
- Conexión de wallet Stellar (obligatoria para operar)
- Perfil empresarial y perfil profesional (freelancer)
- Invitaciones por correo electrónico

### 2. Contratos
- Creación de contratos con título, descripción, monto total, milestones, deadlines y entregables esperados
- Estados: draft → aceptado → activo → completado
- Aceptación, rechazo o solicitud de modificaciones por parte del freelancer
- Fondeo automático del escrow al aceptar el contrato

### 3. Milestones y Entregables
- Definición de milestones con deadlines y montos asignados
- Subida de archivos, links y versiones por parte del freelancer
- Revisión, aprobación o solicitud de cambios por parte de la empresa
- Liberación automática de fondos al aprobar cada milestone

### 4. Escrow (Trustless Work + Stellar)
- Creación automática del escrow al aceptar el contrato
- Fondeo desde la wallet de la empresa
- Fondos bloqueados hasta aprobación de milestones
- Liberación on-chain directamente a la wallet del freelancer
- Hash de transacción Stellar registrado por cada operación

### 5. Disputas
- Apertura de disputa por empresa o freelancer
- Milestone pausado y fondos bloqueados durante la disputa
- Adjuntar evidencia y comentarios por ambas partes
- Resolución mutua o escalamiento al administrador
- Ejecución de la resolución acordada sobre el escrow

### 6. Payroll (Nómina On-Chain)
- Creación de planillas con frecuencia semanal, quincenal o mensual
- Asignación de montos individuales por destinatario (empleados fijos o wallets externas)
- Fondeo del escrow de planilla previo a la ejecución
- Distribución automática en la fecha programada a cada wallet
- Historial de ejecuciones con hash de transacción Stellar
- Notificaciones de pago exitoso

### 7. Notificaciones
- Notificaciones en tiempo real por: entrega aprobada, cambios solicitados, disputa abierta, pago liberado, planilla ejecutada

### 8. Activity Logs
- Registro automático de eventos: contrato creado, milestone aprobado, pago liberado, disputa abierta, planilla ejecutada

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend Web** | React |
| **Aplicación Móvil** | Flutter |
| **Backend** | NestJS (Node.js + TypeScript) |
| **Base de datos** | PostgreSQL |
| **Blockchain** | Stellar + Soroban |
| **Escrow** | Trustless Work (EaaS) |
| **Pagos** | USDC (Circle) sobre Stellar |

---

## Entregables del proyecto

Estos son los entregables que se deben completar **antes** de iniciar el desarrollo:

### Entregables de Planeación
- [ ] **Project Charter** — documento formal de inicio del proyecto con alcance, objetivos, involucrados y restricciones
- [ ] **Documento de requerimientos** — listado funcional y no funcional de lo que debe hacer el sistema
- [ ] **Diagrama de casos de uso** — representación visual de las interacciones de cada rol con el sistema
- [ ] **Diagrama Entidad-Relación (ER)** — modelo de la base de datos con todas las tablas y relaciones
- [ ] **Diagrama de arquitectura** — representación del stack tecnológico y cómo se comunican las capas
- [ ] **Wireframes o mockups** — bocetos de las pantallas principales (web y móvil)
- [ ] **Diagrama de Gantt** — cronograma de actividades con fechas de inicio y fin por fase
- [ ] **Estructura del desglose del trabajo (EDT)** — desglose jerárquico de todas las tareas del proyecto
- [ ] **Análisis de riesgos** — tabla de riesgos identificados con probabilidad, impacto y plan de mitigación

### Entregables de Ejecución
- [ ] **Código fuente completo** — repositorio con frontend web (React), app móvil (Flutter) y backend (NestJS)
- [ ] **Base de datos configurada** — esquema PostgreSQL con migraciones aplicadas
- [ ] **Integración con Trustless Work** — escrow funcional sobre Stellar Testnet
- [ ] **Módulo de payroll operativo** — planillas configurables con distribución automática on-chain
- [ ] **Pruebas funcionales** — validación de contratos, pagos y escrows en entorno de pruebas

### Entregable Final
- [ ] **Código fuente** entregado a Permissionles Escrows Inc.
- [ ] **Minuta de reunión de cierre** firmada
- [ ] **Carta de liberación** o aceptación por parte del asesor empresarial

---

## Alcances y restricciones clave

**El sistema incluye:**
- Gestión de 4 roles: empresa, freelancer, empleado fijo y administrador
- Interfaz web responsiva y aplicación móvil multiplataforma
- Escrow descentralizado con Trustless Work sobre Stellar
- Módulo de payroll automatizado on-chain
- Sistema de disputas con resolución mutua y escalamiento

**El sistema NO incluye:**
- Integración con entidades bancarias tradicionales
- Conversión automática de moneda fiat
- Manuales de usuario ni documentación externa
- Capacitación formal al personal
- Entorno de producción (solo desarrollo y pruebas)
