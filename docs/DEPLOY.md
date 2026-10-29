# Despliegue

Un solo servicio sirve todo: el servidor del juego (API y WebSocket) y la web compilada.

## Compilar y arrancar en local como en producción

```bash
npm install
npm run build          # compila la web (frontend/dist) y el servidor (backend/dist)
STATIC_DIR=frontend/dist PORT=3001 npm start
```

Arranca siempre desde la raíz del proyecto: `STATIC_DIR` se resuelve desde donde se ejecuta el comando.

## Render (plan gratuito)

En **New → Web Service**, con el repositorio conectado:

| Campo             | Valor                                        |
| ----------------- | -------------------------------------------- |
| Language          | Node                                         |
| Root Directory    | _(vacío)_                                    |
| Build Command     | `npm install --include=dev && npm run build` |
| Start Command     | `npm start`                                  |
| Instance Type     | Free                                         |
| Health Check Path | `/health` (en _Advanced_)                    |

`--include=dev` es necesario: Render puede definir `NODE_ENV=production`, y entonces npm omitiría TypeScript, Vite y esbuild, que hacen falta para compilar.

Variables de entorno:

| Variable       | Valor           | Para qué                                          |
| -------------- | --------------- | ------------------------------------------------- |
| `NODE_VERSION` | `22`            | El proyecto necesita Node 22.12 o superior        |
| `STATIC_DIR`   | `frontend/dist` | Carpeta de la web compilada que sirve el servidor |

`PORT` lo define Render solo; no lo agregues. El resto (`BOT_DELAY_MS`, `ROOM_IDLE_TIMEOUT_MS`, `MESSAGES_PER_SECOND`, `LOG_LEVEL`) tiene valores por defecto razonables; la lista completa está en `backend/.env.example`.

El navegador y el servidor comparten dominio, así que no hace falta configurar CORS ni la URL del WebSocket.

### Límites del plan gratuito

- El servicio se duerme tras 15 minutos sin tráfico; la primera visita después tarda hasta un minuto.
- Las salas y partidas viven en la memoria del servidor: si se duerme o se reinicia (por ejemplo, al desplegar una versión nueva), se pierden.
- Los jugadores que estén dentro vuelven a la pantalla de inicio; el cliente se reconecta solo.
