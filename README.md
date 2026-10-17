# datafront

**Bóveda personal de capturas de interfaces (*fronts*) que te gustan, clasificadas por IA.**

Subes una captura y una IA instalada en tu máquina (**Claude Code** o **Codex**) la mira y la etiqueta: tipo de pantalla, estilo, paleta, layout, componentes, densidad y sector. Después filtras el catálogo, eliges varias referencias y copias un prompt listo para pegárselo a otra IA para que genere el front de tu app. Ese prompt incluye la ruta de cada imagen en disco, así que el agente puede abrirlas él mismo.

Este repo es el **frontend** (React + Vite). El backend está en **[Arzival/datafromback](https://github.com/Arzival/datafromback)**. **Necesitas los dos.** Sin backend, la app arranca en «Modo de ejemplo», con datos falsos que no se guardan.

> **Todo corre en tu máquina.** No hay servidor central ni cuentas. La IA que clasifica es tu propio CLI de Claude Code o Codex, con tu sesión. No hace falta ninguna API key.

---

## Índice

- [Qué puedes hacer](#qué-puedes-hacer)
- [Requisitos](#requisitos)
- [Instalación paso a paso](#instalación-paso-a-paso)
- [Instrucciones para agentes de IA](#instrucciones-para-agentes-de-ia)
- [Uso diario](#uso-diario)
- [Configuración](#configuración)
- [Estructura del código](#estructura-del-código)
- [Problemas frecuentes](#problemas-frecuentes)

---

## Qué puedes hacer

- **Subir capturas:** arrastrándolas, eligiéndolas o **pegándolas con ⌘V / Ctrl+V** desde cualquier parte de la app.
- **Elegir qué IA clasifica:** Claude Code (Opus, Sonnet o Haiku) o Codex. La lista de motores y modelos la da el backend.
- **Filtrar el catálogo** por tipo de pantalla, estilo, paleta, layout, componentes, densidad o sector, y buscar por texto.
- **Ver cada captura en grande** con zoom con la rueda del ratón, arrastrar para moverte y doble clic para alternar con el 100 %.
- **Copiar una referencia como prompt**, con descripción, etiquetas, notas de implementación y ruta del archivo.
- **Armar un mix:** marca varias referencias y copia un solo prompt que las combina.
- **Bandeja** (opcional): revisar capturas que te llegan desde otra máquina y decidir una por una si entran o no.
- **Papelera:** borrar pide confirmación, se puede deshacer durante unos segundos y lo borrado se puede restaurar.

## Requisitos

| Qué | Versión | Cómo comprobarlo |
|-----|---------|------------------|
| Node.js | 20.19+ o 22.12+ | `node -v` |
| npm | el que trae Node | `npm -v` |
| El **backend** funcionando | — | `curl -s <tu-api>/health` → `{"status":"ok",…}` |

Los requisitos del backend (PHP, Composer, Python con Pillow y el CLI de Claude o Codex) están en [su README](https://github.com/Arzival/datafromback#requisitos).

## Instalación paso a paso

### 0. Primero el backend

Instala y levanta el backend siguiendo **[su README](https://github.com/Arzival/datafromback#instalación-paso-a-paso)**. Lo más cómodo es clonar los dos repos como carpetas hermanas:

```
proyectos/
├── datafront/        ← este repo
└── datafrontback/    ← el backend
```

### 1. Clonar e instalar

```bash
git clone https://github.com/Arzival/datafront.git
cd datafront
npm install
```

### 2. Apuntar a tu API

```bash
cp .env.example .env
```

Edita `VITE_API_URL` en el `.env`:

| Cómo corres el backend | `VITE_API_URL` |
|------------------------|----------------|
| `./scripts/dev.sh` (recomendado) | `http://127.0.0.1:8000/api` |
| Laravel Herd | `http://<carpeta-del-backend>.test/api` |

### 3. Arrancar

```bash
npm run dev
```

Abre **http://localhost:5174**. El puerto es fijo: si está ocupado, Vite falla en vez de cambiarse a otro, porque el backend solo acepta peticiones desde los puertos de su lista CORS.

### 4. Verificar

- En la esquina inferior izquierda debe decir **«Backend conectado»**, y **no** debe aparecer el aviso amarillo «Modo de ejemplo».
- Pulsa **Subir referencias**, sube una captura y espera entre 30 y 90 s: debe pasar de «En cola» a «Clasificada» con título y etiquetas.

---

## Instrucciones para agentes de IA

Si eres un agente (Claude Code, Codex, Cursor…) y te pidieron «clona y deja lista esta app»:

1. **Prepara antes el backend** siguiendo la sección «Instrucciones para agentes de IA» de su README: [Arzival/datafromback](https://github.com/Arzival/datafromback#instrucciones-para-agentes-de-ia). Este frontend no hace nada útil sin él.
2. **Clona este repo** como carpeta hermana del backend.
3. Ejecuta `npm install`, luego `cp .env.example .env`, y pon en `VITE_API_URL` la URL real de la API, terminada en `/api`. Compruébala antes con `curl -s <URL>/health`.
4. **Levanta el servidor de desarrollo** con `npm run dev` en segundo plano. En macOS, si el usuario quiere que arranque solo al iniciar sesión, usa `./scripts/servicio.sh instalar`.
5. **Verifica.** La tarea está terminada cuando:
   - `npm run build` termina sin errores;
   - `npm run lint` no reporta errores;
   - `curl -s http://localhost:5174` devuelve el HTML de la app;
   - y la API configurada responde en `/health`, que es la condición para que la app **no** arranque en «Modo de ejemplo».
6. **Dale al usuario la URL** http://localhost:5174 y recuérdale que la primera clasificación necesita que haya iniciado sesión en `claude` o `codex`.

Reglas para agentes:

- **No cambies el puerto 5174** sin añadir el nuevo origen a `CORS_ALLOWED_ORIGINS` en el backend.
- **No actives `VITE_USE_MOCK`** salvo que el usuario quiera una demo: con él activo no se guarda nada.
- **No subas `.env` a Git.** Ya está en el `.gitignore`.

## Uso diario

| Quieres… | Haz… |
|----------|------|
| Arrancar en desarrollo | `npm run dev` y abre http://localhost:5174 |
| Que arranque solo al iniciar sesión (macOS) | `./scripts/servicio.sh instalar` |
| Ver si el servicio está vivo | `./scripts/servicio.sh estado` |
| Ver su log | `./scripts/servicio.sh logs` |
| Reiniciarlo (tras `npm install`) | `./scripts/servicio.sh reiniciar` |
| Quitar el servicio | `./scripts/servicio.sh quitar` |
| Compilar para producción | `npm run build`. Queda en `dist/` |
| Revisar el código | `npm run lint` (oxlint) |

**Atajos dentro de la app:**

- **⌘V / Ctrl+V** pega una imagen copiada y abre la subida.
- En el visor: **rueda** para zoom, **arrastrar** para moverte, **doble clic** para alternar con 100 %, **0** ajusta a la pantalla, **1** pone el tamaño real y **+ / −** acercan y alejan.

## Configuración

Variables del `.env` (las lee Vite al arrancar; si las cambias, reinicia `npm run dev`):

| Variable | Ejemplo | Qué es |
|----------|---------|--------|
| `VITE_API_URL` | `http://127.0.0.1:8000/api` | URL de la API del backend, terminada en `/api` |
| `VITE_USE_MOCK` | `true` | *Opcional.* Fuerza datos de ejemplo aunque la API responda |

## Estructura del código

```
src/
├── App.tsx              # layout, vistas (catálogo, mix, bandeja, papelera) y estado global
├── api/
│   ├── VaultApi.ts      # contrato de operaciones
│   ├── httpVault.ts     # implementación contra el backend
│   └── mockVault.ts     # datos de ejemplo en memoria («Modo de ejemplo»)
├── hooks/               # useReferences, useInbox, useTrash, useProviders… (con sondeo)
├── components/          # tarjetas, ficha, visor con zoom, subida, bandeja, papelera…
├── lib/
│   ├── prompt.ts        # cómo se arma el prompt de una referencia y del mix
│   └── facets.ts        # filtros del catálogo
└── types/vault.ts       # tipos compartidos; reflejan exactamente la API
```

Mientras haya referencias clasificándose, el catálogo se actualiza solo cada 2.5 s. La bandeja se actualiza cada 4 s mientras la tienes abierta. Sin librerías de UI: CSS plano con tokens en `src/index.css`.

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Aviso amarillo «Modo de ejemplo» | La app no llega a la API | Revisa `VITE_API_URL` y que `curl <URL>/health` responda; después reinicia `npm run dev` |
| Error de CORS en la consola del navegador | El origen no está en la lista del backend | Usa el puerto 5174 o añade el tuyo a `CORS_ALLOWED_ORIGINS` en el backend |
| `Port 5174 is already in use` | Otro proceso usa el puerto | Ciérralo, o cambia el puerto en `vite.config.ts` **y** en el CORS del backend |
| Se quedan en «En cola» para siempre | El worker del backend no corre | Ver el README del backend |
| «No se pudo copiar» | El navegador bloqueó el portapapeles | Usa la app en `localhost` (no por IP de red) y da permiso de portapapeles |
| Pegar con ⌘V no hace nada | Lo copiado no es una imagen, o el foco está en un campo de texto | Copia la imagen en sí, no su enlace, y haz clic fuera del campo |
