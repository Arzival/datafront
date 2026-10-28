# datafront · frontend — notas para agentes

Esto es el frontend (React 19 + Vite 8 + TypeScript) de **datafront**, una bóveda local de capturas de UI que clasifica la IA. **No funciona solo:** necesita el backend del repo hermano `datafromback` (Laravel).

- **Para instalar o dejar lista la app**, sigue la sección **«Instrucciones para agentes de IA»** del `README.md`. Empieza por el backend.
- La URL de la API va en `.env` → `VITE_API_URL` (terminada en `/api`). Si no responde, la app entra en el modo demo («Modo de ejemplo», con 27 referencias reales de ejemplo): eso **no** cuenta como instalación terminada.
- El puerto es fijo, `5174` (`strictPort`). Si lo cambias, añade el origen nuevo a `CORS_ALLOWED_ORIGINS` en el backend.
- Antes de dar algo por terminado: `npm run build` y `npm run lint` sin errores.
- Los tipos de `src/types/vault.ts` reflejan exactamente la API del backend. Si cambias uno, cambia el otro.
