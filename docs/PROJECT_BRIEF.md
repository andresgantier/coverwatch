# CoverWatch – Project brief

## 1. Escenario
**Velden Klimatechnik GmbH** (ficticia, Ruhrgebiet): instala y da servicio a equipos de climatización (aires acondicionados, bombas de calor y equipos de ventilación) para unos 60 clientes B2B: oficinas, clínicas, hoteles, tiendas, colegios y salas de servidores pequeñas. Unos 180 equipos instalados en los edificios de los clientes.
El negocio vive de los contratos de mantenimiento: el cliente paga una cuota anual y, a cambio, la empresa hace visitas preventivas (limpieza, revisión, cambio de filtros) y responde a las averías en un tiempo acordado (SLA). Si un aire acondicionado falla en una sala de servidores o en una clínica en verano, la respuesta tiene que ser en horas.
Hoy los contratos viven en un Excel, los PDFs en carpetas compartidas y los vencimientos en recordatorios de Outlook de una sola persona.
Equipo: 1 jefe de servicio, 2 coordinadores, 6 técnicos, 1 persona de ventas/posventa y la gerencia.

**Posicionamiento:** el paso entre el Excel y un sistema de gestión de servicio (tipo SAP Service o ServiceNow), para una empresa que todavía no necesita ni puede pagar uno.

## 2. Problemas que resuelve
1. Contratos que vencen sin que nadie lo note: equipos sin cobertura e ingresos de renovación perdidos.
2. Plazos de preaviso que se pasan: renovaciones automáticas no deseadas o rescisiones fuera de plazo.
3. Tiempos de respuesta (SLA) que no se miden: reclamos de clientes sin datos para responder.
4. Visitas preventivas atrasadas o salteadas, que son justo lo que el contrato promete.
5. No está claro qué equipo está cubierto por qué contrato: se trabaja gratis en equipos sin contrato.
6. No hay una vista del valor de la cartera ni de las renovaciones que vienen.
7. Todo depende del Excel de una persona; si se pierde o esa persona falta, nadie sabe nada.

## 3. Usuarios y roles (permisos reales con RLS)
| Rol | Quién | Puede |
|---|---|---|
| `manager` | Jefe de servicio | Todo: contratos, renovaciones, datos maestros, usuarios, exportes |
| `coordinator` | Coordinadores | Clientes, sitios, equipos, solicitudes de servicio, planificar visitas; ver contratos |
| `technician` | Técnicos | Ver y cerrar solo SUS visitas y solicitudes asignadas (registrar respuesta, resolución, resultado) |
| `viewer` | Gerencia, ventas | Solo lectura de todo + exportes |
Demo: botón "Explore the demo" con selección de rol (Manager / Coordinator / Technician), cada uno con su cuenta demo, para que se vea que los permisos cambian.

## 4. Alcance (funcionalidades)
1. **Datos maestros:** clientes, sitios (dirección, contacto), equipos instalados (n.º de serie, marca y modelo, tipo: `SPLIT_AC`, `MULTI_SPLIT`, `HEAT_PUMP`, `VENTILATION`, `CHILLER`; potencia de frío en kW, sitio, fecha de instalación, fin de garantía, estado), técnicos (perfiles).
2. **Contratos:** número, cliente, tipo (`FULL_SERVICE`, `PREVENTIVE`, `ON_CALL`), inicio, fin, preaviso en días, renovación automática sí/no, valor anual (EUR), frecuencia de facturación (informativa), SLA de respuesta en horas por prioridad (P1/P2/P3), visitas preventivas por año, equipos cubiertos, PDF del contrato (Supabase Storage), notas.
   - Ciclo de vida: `DRAFT` → `ACTIVE` → `EXPIRED` / `RENEWED` / `TERMINATED`. "Por vencer" es un estado calculado, no guardado.
   - Renovar crea una versión nueva enlazada a la anterior (`previous_contract_id`), copiando los equipos; la anterior pasa a `RENEWED`. Nada se borra.
   - Un equipo no puede estar en dos contratos activos con fechas superpuestas (restricción `EXCLUDE` con rangos de fechas).
3. **Pipeline de renovaciones:** contratos ordenados por fecha límite de decisión (fin − preaviso): vencida, ≤ 30, ≤ 60, ≤ 90 días, con valor en juego.
4. **Solicitudes de servicio (tickets):** equipo, fecha y hora del aviso, prioridad, descripción, técnico asignado, primera respuesta, resolución, inicio y fin de la falla.
   - Al crearla, la base determina si el equipo estaba cubierto en esa fecha y qué SLA aplica.
   - SLA cumplido si primera respuesta − aviso ≤ horas del SLA. Tickets en equipos sin cobertura se marcan como facturables (oportunidad de venta).
5. **Mantenimiento preventivo:** al activar un contrato, una función genera las visitas planificadas repartidas en el año según "visitas por año". Coordinador asigna técnico y fecha; técnico registra fecha real, resultado y observaciones. Visitas vencidas = planificada < hoy y no realizada.
6. **Ficha de cliente (vista 360):** contratos, equipos, tickets, visitas, KPIs del cliente.
7. **Dashboard:** contratos activos, valor anual de la cartera, renovaciones en 90 días (cantidad y valor), decisiones de renovación vencidas, % SLA cumplido (90 días), visitas preventivas vencidas y % de cumplimiento del plan, tickets abiertos por prioridad, disponibilidad de equipos, tickets facturables sin contrato, top clientes por valor.
8. **Alertas en la app:** lista de lo que requiere acción hoy (decisiones de renovación, visitas vencidas, tickets fuera de SLA). Sin correos.
9. **Continuidad y respaldo (pensado para uso real):**
   - Botón **Export to Excel** en cada lista (respeta los filtros).
   - **Full export:** un .xlsx con una hoja por tabla, para que alguien sin conocimientos técnicos tenga todos los datos.
   - **Vista imprimible** "This week": visitas de la semana, tickets abiertos y renovaciones próximas, para trabajar en papel si se cae el sistema o internet.
   - **Backup nocturno automático** con GitHub Actions (dump de la base con Supabase CLI) guardado en un repositorio PRIVADO separado, más un procedimiento de restauración probado y documentado en `docs/RUNBOOK.md`.
   - Página `/api/health` y un log de errores legible.
10. **Usuarios:** login con email y contraseña, roles, cuentas demo.

## 5. Reglas de negocio (en la base de datos)
- Fecha límite de decisión = `end_date − notice_period_days`.
- Por vencer: activo y fecha límite de decisión ≤ hoy + 90 días.
- SLA: `first_response_at − reported_at ≤ sla_hours(priority)` → cumplido; sin respuesta y fuera de plazo → incumplido.
- Disponibilidad del equipo (90 días) = 1 − horas de falla / horas del período.
- Cumplimiento del plan preventivo = visitas realizadas a tiempo / visitas planificadas vencidas.
- Valor anual de la cartera = suma del valor anual de contratos activos.
- Auditoría: todo cambio en contratos y tickets queda en `audit_log` (quién, cuándo, qué cambió).

## 6. Fuera de alcance (no proponer ni reabrir)
Facturación y cobros, firma electrónica, correos/SMS/notificaciones push, portal para clientes, app móvil u offline, IA dentro de la app, integración con ERP, multi-moneda, multi-idioma, inventario de repuestos (eso es SpareLedger), escaneo QR.

## 7. Simplificaciones conscientes (para explicar en entrevistas)
Valor anual fijo por contrato (sin precios por equipo ni ajustes por inflación), SLA solo de primera respuesta (no de resolución), una zona horaria (Europe/Berlin), datos sintéticos.

## 8. Datos de demo
Script re-ejecutable con fechas relativas a hoy: ~60 clientes, ~110 sitios, ~180 equipos, ~90 contratos en 2 años (incluidas renovaciones encadenadas), ~12 meses de tickets y visitas.
Mezcla deliberada para que el dashboard tenga historia: contratos por vencer en 30/60/90 días, algunas decisiones de renovación vencidas, ~10% de tickets fuera de SLA, visitas preventivas atrasadas, tickets en equipos sin contrato, un cliente con mala disponibilidad (por ejemplo, una sala de servidores con averías repetidas).

## 9. Fases (cada una con su criterio de aceptación)
0. **Setup:** proyecto Next.js, Supabase (región EU) vinculado con CLI, GitHub. ✔ `/api/health` responde `ok: true` contra Supabase.
1. **Modelo de datos:** diagrama ER simple + migración con tablas, restricciones e índices. ✔ consultas de verificación y una inserción inválida rechazada.
2. **Lógica en la base:** vistas, funciones (activar, renovar, generar visitas), triggers de auditoría, RLS por rol. ✔ pruebas SQL por rol: un técnico no ve visitas ajenas.
3. **Datos de demo + cuentas demo.** ✔ el resumen del script muestra la mezcla del punto 8.
4. **App base:** layout, navegación según rol, login, demo por rol. ✔ el menú cambia según el rol.
5. **Datos maestros:** clientes, sitios, equipos. ✔ crear, editar, desactivar; errores de la base mostrados en el campo.
6. **Contratos y renovaciones:** lista, ficha, alta, activación, renovación, PDF. ✔ renovar crea la versión nueva y la anterior queda `RENEWED`.
7. **Solicitudes de servicio y SLA.** ✔ cobertura y SLA calculados por la base.
8. **Plan preventivo y vista del técnico.** ✔ el técnico solo ve y cierra lo suyo.
9. **Dashboard, alertas y ficha de cliente.** ✔ los KPIs coinciden con las listas.
10. **Continuidad:** exportes a Excel, full export, vista imprimible, backup nocturno, restauración probada, `docs/RUNBOOK.md`. ✔ el Excel abre bien y una restauración de prueba funciona.
11. **Publicación en Vercel y prueba de punta a punta** (con cada rol y desde el celular).
12. **Documentación:** README con capturas y diagrama simple, página de Notion con la misma estructura que mis otros proyectos, líneas de CV en inglés y alemán, y `docs/PRODUCTION.md`: qué cambiaría para usarlo en una empresa real (planes pagos, backups, seguridad, soporte).

## 10. Ideas para explicar en entrevistas
1. OLTP: los datos se crean validados en la propia app; no hay limpieza posterior.
2. Las reglas viven en PostgreSQL (restricciones, triggers, RLS): se cumplen aunque alguien se salte la pantalla.
3. Historial inmodificable y auditoría: trazabilidad de quién cambió qué, como en un ERP.
4. Fecha límite de decisión vs. fecha de fin: lo que importa para no perder una renovación es el preaviso.
5. Continuidad: exportes para usuarios no técnicos + backups automáticos con restauración probada.
6. Permisos por rol con RLS: el técnico ve solo su trabajo, por regla de la base y no por la pantalla.
