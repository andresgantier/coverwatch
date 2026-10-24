# CoverWatch – instrucciones para Claude Code

@AGENTS.md

> Lee `docs/PROJECT_BRIEF.md` al empezar cada fase: ahí están el negocio, el alcance, las reglas y las fases con sus criterios de aceptación.

## Quién soy
Andrés Gantier Müller (Essen, Alemania). Ingeniero Industrial y de Sistemas, M.Sc. Informatics & Business (FH Südwestfalen, 2026).
Fuerte en Power BI, DAX, modelado de datos y SQL; trabajo como BI Analyst con control de inventario de equipos y repuestos y seguimiento de contratos de mantenimiento.
NO sé desarrollo web (React/Next.js). Necesito entender la arquitectura y las decisiones, no cada línea de código.
Ya construí SpareLedger (inventario de repuestos con Next.js + Supabase + Vercel) trabajando con Claude, así que conozco el flujo básico: VS Code, terminal, Git, Supabase SQL Editor y Vercel.

## Objetivo
Una app web de gestión de contratos de servicio y mantenimiento para mi portfolio:
1. Que resuelva un problema real y lleve a una empresa pequeña o mediana del Excel al siguiente paso.
2. Que muestre ingeniería industrial (SLA, disponibilidad, mantenimiento preventivo), datos (modelo relacional, lógica en SQL, KPIs) y digitalización de procesos.
3. Que se pueda mostrar con un link público y explicar con seguridad en entrevistas.
4. Que esté pensada para usarse de verdad: exportes a Excel, backups y continuidad si algo falla.
Todo con herramientas gratuitas.

## Cómo trabajamos
- Tú haces todo el trabajo: diseño, código, SQL, datos de demo, pruebas y documentación. Yo apruebo, pruebo en el navegador y pregunto. No me des tareas, pistas ni ejercicios.
- Trabaja fase por fase (ver el brief). Antes de empezar una fase, resúmeme en 3–5 líneas qué vas a hacer y espera mi OK.
- Cuando necesites que yo haga algo fuera de la terminal (crear una cuenta, pegar una clave, hacer clic en un panel web), dame pasos numerados, diciendo exactamente dónde hacer clic, como para alguien que nunca lo hizo.
- Nunca me pidas ni escribas claves en archivos que se suben a GitHub. Las claves van en `.env.local` (y yo las cargo en Vercel). No inventes datos que dependen de mí (cuentas, URLs, contraseñas): pídemelos.
- Si hay varias formas de hacer algo, elige la estándar en la industria y explícala en una línea.
- Si algo falla, investiga la causa, corrígelo y explícame en 2–3 líneas qué era.
- Verifica antes de decir que algo funciona: `npm run build` y `npm run lint` sin errores, y la consulta o pantalla de verificación de la fase.
- Al cerrar cada fase dame: qué se hizo (3–5 líneas), cómo lo verifico yo (qué abrir y qué debería ver) y 2–3 líneas de cómo lo explicaría en una entrevista.
- Commits: cuando yo confirme que la fase funciona, haz commit con un mensaje claro en inglés (`Phase N: ...`) y push a `main`. No hagas push sin mi confirmación.
- No agregues funcionalidades fuera del alcance del brief ni reabras lo que está fuera de alcance. Si ves una mejora valiosa, anótala en `docs/IDEAS.md` y sigue.

## Formato de tus respuestas
- Español latinoamericano, conciso, natural, sin relleno ni frases que suenen a IA. Directo y honesto.
- Explicaciones a nivel principiante en desarrollo web; puedes asumir que sé SQL y modelado de datos.
- Tablas, columnas, código, interfaz de la app y documentación en inglés.
- Comentarios breves en inglés en el código y en el SQL.
- No mencionar IA en la documentación, el README ni las líneas del CV salvo que yo lo pida.

## Stack (todo gratis)
- Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui, Recharts.
- Supabase: PostgreSQL + Auth + Storage (PDFs de contratos).
- Exportes a Excel con `exceljs` (genera .xlsx real con formato).
- GitHub (código) + GitHub Actions (backup nocturno) + Vercel (publicación automática en cada push).
- Si alguna pieza dejó de ser gratuita o cambió, avísame antes de seguir.

## Entorno
- Windows 11, PowerShell, VS Code, Node.js LTS, Git. Navegador Chrome.
- Carpeta del proyecto: `C:\Users\andre\dev\coverwatch` (confírmalo con `pwd`).
- Supabase: región EU (Frankfurt o Irlanda). Vercel: misma región que Supabase (`vercel.json` → `regions`).

## Arquitectura (reglas fijas)
- La lógica de negocio vive en PostgreSQL: vistas para estados y KPIs, funciones para acciones que cambian varias tablas, triggers para reglas que nunca se pueden saltar, restricciones CHECK/UNIQUE/EXCLUDE.
- Row Level Security en TODAS las tablas, con permisos por rol (ver el brief). La app nunca usa la clave `service_role`.
- La app lee de vistas y escribe con funciones o formularios validados. Validación doble: mensajes claros en pantalla y la base como árbitro final.
- Historial inmodificable: los contratos no se borran (cambian de estado o se renuevan como versión nueva) y hay un log de auditoría por trigger.
- Cambios de base de datos SOLO como migraciones numeradas en `supabase/migrations/` con Supabase CLI (`npx supabase db push`). Nunca scripts que borren datos en una base con datos reales. Los datos de demo van en un script aparte, re-ejecutable.
- Antes de usar un comando o flag de la Supabase CLI, Vercel o Next.js, verifica que exista en la versión instalada (`--help` o la documentación en `node_modules/next/dist/docs/`).

## Lecciones de SpareLedger (aplícalas desde el inicio)
- Next.js 16 con `cacheComponents`: todo lo que lea cookies/sesión o datos en vivo va dentro de `<Suspense>` y empieza con `await connection()`. `usePathname()` en el layout también va en `<Suspense>`.
- La protección de rutas va en `proxy.ts` (antes `middleware.ts`) con `@supabase/ssr` y `getClaims()`; nunca confiar en `getSession()` del lado del servidor.
- Variables: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; credenciales de las cuentas demo solo en variables de servidor (sin `NEXT_PUBLIC_`).
- En Vercel, cargar las variables ANTES del primer deploy. Las `NEXT_PUBLIC_` se incrustan al compilar: después de cambiarlas hay que hacer Redeploy.
- `create-next-app` no corre en una carpeta con archivos: generar el proyecto en una subcarpeta temporal y mover los archivos, conservando este `CLAUDE.md`. Si el generador crea su propio `AGENTS.md`, se importa arriba.
- Los avisos LF/CRLF de Git en Windows son inofensivos. Nunca `npm audit fix --force`.
- La app corre con `npm run dev` en una terminal; los demás comandos van en otra.
- El plan gratuito de Supabase pausa el proyecto tras 7 días sin uso.
- En el portfolio solo se muestra lo que yo puedo explicar: diagramas simples, sin detalles internos de Next.js.

## Conexiones (base de datos, GitHub, publicación)
- Tú ejecutas los comandos en mi computadora; yo hago una sola vez los logins en el navegador: `npx supabase login` + `npx supabase link` (me pedirá la contraseña de la base: la escribo yo en la terminal, nunca en el chat), Git ya está conectado a GitHub, y Vercel se conecta al repo una vez desde su panel.
- Base de datos: aplicas los cambios con migraciones vía Supabase CLI. Si está conectado el servidor MCP de Supabase, úsalo solo para leer y verificar (consultas, estructura), no para cambiar la base.
- Claves: yo copio URL y publishable key del panel de Supabase a `.env.local`; tú me dices exactamente dónde encontrarlas. En Vercel las cargo yo antes del primer deploy, con tus pasos.
- Nunca uses ni pidas la clave `service_role`. El backup de GitHub Actions usa la cadena de conexión de la base, guardada como *secret* del repositorio privado de backups (la cargo yo con tus pasos).

## Comandos
- `npm run dev` – app local en http://localhost:3000
- `npm run build` / `npm run lint` – verificación antes de cada cierre de fase
- `npx supabase db push` – aplica migraciones a la base remota
- `npm run db:seed` – regenera los datos de demo (lo defines en la Fase 3)
