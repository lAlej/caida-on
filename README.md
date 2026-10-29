# Caída Online

Caída, el juego de cartas venezolano, para jugar en línea de 2 a 4 personas. Se crea una sala, se comparte el código y gana quien llegue primero a 24 puntos con caídas, cantos y cartas ganadas.

- Partidas en tiempo real por WebSocket, con bots para completar la mesa o cubrir a quien se desconecta.
- El servidor es quien aplica las reglas: el navegador solo muestra y pide jugadas.
- Reconexión automática: si recargas o pierdes la conexión, vuelves a tu asiento.

Las reglas están en [`docs/REGLAS.md`](docs/REGLAS.md).

## Requisitos

- Node.js 22.12 o superior
- npm 10 o superior

## Empezar

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>. `npm run dev` levanta a la vez el servidor (puerto 3001) y la web (puerto 5173); Vite reenvía `/api` y `/ws` al servidor. Para jugar solo, crea una sala, pulsa **Añadir bot** y empieza.

Para configurar el servidor copia `backend/.env.example` a `backend/.env` y ajusta lo que necesites.

## Comandos

Se ejecutan desde la raíz del proyecto.

| Comando             | Qué hace                                                        |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | Servidor y web en modo desarrollo, con recarga automática       |
| `npm run build`     | Compila la web (`frontend/dist`) y el servidor (`backend/dist`) |
| `npm start`         | Arranca el servidor compilado (después de `npm run build`)      |
| `npm test`          | Pruebas de los tres paquetes                                    |
| `npm run typecheck` | Revisa los tipos de los tres paquetes                           |
| `npm run lint`      | ESLint                                                          |
| `npm run format`    | Da formato con Prettier (`format:check` solo comprueba)         |

## Estructura

Es un monorepo de npm con tres paquetes:

```
caida-online/
├── shared/      Reglas puras y protocolo, usados por el servidor y la web
│   └── src/     cartas, capturas, puntos, cantos, mensajes y tipos de vista
├── backend/     Express + WebSocket (ws)
│   └── src/
│       ├── game/       motor de la partida, sin red
│       ├── bots/       bot aleatorio
│       ├── rooms/      salas, bots por desconexión y regreso
│       ├── sessions/   token secreto del navegador ↔ identidad pública
│       └── server/     router de mensajes y transporte WebSocket
├── frontend/    React + Vite
│   └── src/
│       ├── components/ cartas y piezas de interfaz reutilizables
│       ├── features/   lobby, sala de espera y mesa de juego
│       ├── net/        cliente WebSocket y API HTTP
│       └── state/      estado de la aplicación
└── docs/        reglas del juego
```

## Cómo funciona

```
 Navegador (React)  ──  WebSocket /ws  ──►  GameServer ──► Room ──► CaidaGame (reglas)
                    ◄──  roomUpdate  ─────                          ▲
                    ──   GET /api/rooms  ─►  Express                 └─ bots
```

- **`shared`** contiene todo lo que debe ser idéntico en el servidor y en el navegador: la baraja, la cadena de captura, los puntos y los cantos. Así la vista previa de una jugada usa las mismas reglas que el servidor.
- **`CaidaGame`** es el motor: recibe acciones, valida las reglas y devuelve los eventos ocurridos. No sabe nada de red ni de salas, por eso se prueba con partidas simuladas y mazos preparados.
- **`Room`** reúne a los jugadores, arranca la partida, programa las jugadas de los bots y reparte a cada jugador **su propia vista**: solo ve su mano; de los demás conoce la cantidad de cartas y el canto anunciado.
- **Identidad:** el navegador guarda un token secreto y se identifica con él. El resto de jugadores solo ve un `playerId` público, nunca el token. Con el token se recupera el asiento tras una desconexión.

### Protocolo

Los mensajes del cliente se validan con `zod` antes de usarse.

| Dirección          | Mensajes                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Cliente → servidor | `identify`, `createRoom`, `joinRoom`, `leaveRoom`, `addBot`, `startGame`, `chooseMesaOrder`, `playCard` |
| Servidor → cliente | `identified`, `roomUpdate` (vista de la sala y eventos), `roomLeft`, `error`                            |
| HTTP               | `GET /health`, `GET /api/rooms` (salas abiertas)                                                        |

### Configuración del servidor

Variables de entorno, todas opcionales (lista completa en [`backend/.env.example`](backend/.env.example)):

| Variable               | Por defecto             | Para qué                                                                |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `PORT`                 | `3001`                  | Puerto HTTP y WebSocket                                                 |
| `CORS_ORIGIN`          | `http://localhost:5173` | Orígenes permitidos, separados por comas                                |
| `BOT_DELAY_MS`         | `1200`                  | Pausa antes de que juegue un bot                                        |
| `ROOM_IDLE_TIMEOUT_MS` | `300000`                | Cuánto espera una sala sin jugadores conectados antes de cerrarse       |
| `MESSAGES_PER_SECOND`  | `30`                    | Límite de mensajes por conexión                                         |
| `STATIC_DIR`           | _(sin definir)_         | Carpeta de la web compilada; si se define, el servidor también la sirve |
| `LOG_LEVEL`            | `info`                  | `debug`, `info`, `warn` o `error`                                       |

## Calidad

- TypeScript estricto en los tres paquetes, ESLint y Prettier.
- Pruebas con Vitest: reglas, motor de la partida (incluidas simulaciones de cientos de partidas entre bots que comprueban que siempre suman 40 cartas), salas, protocolo, componentes y una prueba de integración con WebSockets reales.

## Notas técnicas

- La web usa **Vite 7 y Vitest 3**, con `rollup` sustituido por `@rollup/wasm-node` (ver `overrides` en el `package.json` raíz). El desarrollo se hizo en un equipo Windows cuya política de seguridad bloquea el binario nativo de las versiones más nuevas. Funciona igual en cualquier sistema; si no tienes esa restricción, puedes actualizar.
- **Limitaciones de la versión 1:** las salas y partidas viven en la memoria de un solo proceso (si el servidor se reinicia, se pierden); no hay cuentas, chat, revancha ni juego en parejas.

## Más documentación

- [`docs/REGLAS.md`](docs/REGLAS.md): reglas del juego y dónde se implementa cada una
