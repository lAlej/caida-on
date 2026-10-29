# Caída Online: plan de tickets

Reglas de referencia: `docs/REGLAS.md` (T31). Diseño: https://claude.ai/artifact/3vAUKvPDgVqQZvCN2vxwEj

## Cómo trabajamos

- **Un ticket a la vez.** Cada uno cambia una sola cosa y cabe en una revisión corta (unas 150 líneas de código más sus pruebas).
- **Definición de terminado** para todos: `npm run typecheck`, `npm run lint` y `npm test` en verde, sin código muerto y sin `any`.
- **Orden:** los hitos van en cadena (M0 → M1 → M2 → M3 → M4). Dentro de un hito, los tickets sin dependencia entre sí se pueden hacer en cualquier orden.
- **Tamaño:** S = menos de 80 líneas, M = 80 a 150, L = más de 150 (si un ticket sale L, se parte).
- **Estado:** `[ ]` pendiente · `[~]` escrito pero sin verificar · `[x]` terminado y verificado.

## Hitos

| Hito | Objetivo                           | Tickets   |
| ---- | ---------------------------------- | --------- |
| M0   | Base del repo y reglas compartidas | T01 – T03 |
| M1   | Motor del juego, sin red           | T04 – T11 |
| M2   | Servidor: salas, bots y WebSocket  | T12 – T19 |
| M3   | Interfaz en React                  | T20 – T30 |
| M4   | Documentación y cierre             | T31 – T32 |

---

## M0 · Base del repo y reglas compartidas

### T01 · Monorepo y herramientas · S · `[x]`

- npm workspaces (`shared`, `backend`, `frontend`), `tsconfig.base.json`, ESLint (flat config), Prettier, `.editorconfig`, `.gitignore`, scripts raíz.
- `backend` y `frontend` tienen por ahora un `package.json` mínimo, solo para que npm reconozca los workspaces. Se completan en T12 y T20.
- **Listo cuando:** `npm install` funciona y `npm run lint` corre sin errores en el repo vacío.

> **Restricción del equipo:** Windows (Application Control) bloquea el binario nativo de rolldown, que usan Vite 8 y Vitest 5. Por eso el proyecto usa **Vite 7 y Vitest 3**, con `rollup` sustituido por `@rollup/wasm-node` mediante `overrides` en el `package.json` raíz. `esbuild` y `tsx` sí funcionan. En T20 hay que usar `vite@^7`.

### T02 · `shared`: cartas, capturas, puntos y cantos · M · `[x]`

- `cards.ts`, `scoring.ts`, `capture.ts`, `canto.ts` con sus pruebas: cadena de capturas (5-6-7, corte en el hueco, salto del 7 al 10), puntos de caída y mesa, y detección de cantos sobre las 9.880 manos posibles.
- **Listo cuando:** las pruebas confirman estas cantidades: trivilín 40, patrulla 512, vigía 432, registro 64, ronda 1.728, sin canto 7.104.

### T03 · `shared`: protocolo y tipos de vista · M · `[x]`

- Mensajes cliente → servidor validados con zod: `identify`, `createRoom`, `joinRoom`, `leaveRoom`, `addBot`, `startGame`, `chooseMesaOrder`, `playCard`.
- Mensajes servidor → cliente: `identified`, `roomUpdate`, `roomLeft`, `error`. Tipos `RoomView`, `GameView`, `GameEvent` y códigos de error.
- **Listo cuando:** hay pruebas de que los mensajes válidos pasan y los mal formados se rechazan.

---

## M1 · Motor del juego (`backend/src/game`, sin red)

### T04 · Aleatoriedad y baraja · S · `[x]`

- `Random` inyectable, mezcla Fisher-Yates y generador con semilla para pruebas.
- **Listo cuando:** la misma semilla da siempre la misma mezcla y la baraja tiene 40 cartas distintas.

### T05 · Motor: empezar baraja y entrega de la mesa · M · `[x]`

- Sorteo del primer repartidor, elección del orden (1-2-3-4 o 4-3-2-1), 4 cartas a la mesa sin valores repetidos (la repetida vuelve al mazo), puntos por aciertos y mal echada.
- **Listo cuando:** hay pruebas con semilla fija para aciertos, mal echada y carta repetida.

### T06 · Motor: repartir la mano y anunciar cantos · M · `[x]`

- Reparto de 3 cartas desde el jugador a la derecha del repartidor, detección de cantos, ganador del canto con desempate por cercanía al repartidor.
- **Listo cuando:** hay pruebas del ganador entre cantos distintos, iguales y empatados.

### T07 · Motor: jugar una carta · L (partir si crece) · `[x]`

- Validación de turno y de que la carta esté en la mano, lanzar o capturar automáticamente, caída (solo sobre la carta recién lanzada), mesa limpia, caída con mesa y victoria inmediata a los 24.
- **Listo cuando:** hay pruebas de cada caso y de los errores (`NOT_YOUR_TURN`, `CARD_NOT_IN_HAND`).

### T08 · Motor: cerrar la mano · S · `[x]`

- Al quedarse todos sin cartas se suman los puntos del canto ganador (con posible victoria) y se reparte de nuevo si queda mazo.
- **Listo cuando:** hay pruebas de que los puntos se suman al final de la mano y no antes.

### T09 · Motor: terminar la baraja · M · `[x]`

- Las cartas de la mesa van al último que capturó, conteo de cartas (2: 20, 3: 14/13/13, 4: 10), victoria con más puntos y sorteo en caso de empate, o nueva baraja con el repartidor siguiente.
- **Listo cuando:** hay pruebas con 2, 3 y 4 jugadores y con empate al pasar de 24.

### T10 · Motor: vista por jugador · S · `[x]`

- Proyección del estado para cada jugador: solo ve su mano; los demás se ven como cantidad de cartas.
- **Listo cuando:** una prueba demuestra que la vista de un jugador no contiene las cartas de otro.

### T11 · Bot aleatorio y simulación completa · M · `[x]`

- Bot que elige el orden de la mesa y la carta al azar. Prueba que simula cientos de partidas completas con semillas distintas.
- **Listo cuando:** todas las partidas terminan sin errores y en cada paso las 40 cartas suman 40 entre mano, mesa, mazo y montones.

> **Notas del hito M1:** el motor expone `apply(playerId, action)` con un tipo `GameAction`, para que humanos y bots entren por la misma puerta. Las opciones `initialDeck` e `initialScores` del constructor existen solo para pruebas con escenarios exactos. El bot decide con `decideBotAction` y no mueve nada por sí mismo: quien lo programa (la sala, en T15) aplica la acción.

---

## M2 · Servidor (`backend`)

### T12 · Esqueleto Express · S · `[x]`

- Configuración por variables de entorno (`.env.example`), logger, `GET /health`, CORS configurable, cierre ordenado con SIGINT/SIGTERM.
- **Listo cuando:** `npm run dev -w backend` arranca y `/health` responde.

### T13 · Sesiones · S · `[x]`

- Token secreto del cliente ↔ `playerId` público, nombre, sala actual y conexión actual.
- **Listo cuando:** hay pruebas de que el mismo token devuelve la misma sesión y de que el `playerId` nunca expone el token.

### T14 · Salas: lobby · M · `[x]`

- `Room` y `RoomManager`: crear con código de 4 letras, unirse, salir, añadir bot, reasignar anfitrión y empezar (mínimo 2 jugadores).
- **Listo cuando:** hay pruebas de sala llena, no anfitrión, partida ya iniciada y sala vacía que se elimina.

### T15 · Salas: flujo de partida y bots · M · `[x]`

- La sala conecta las acciones de los jugadores con el motor, difunde `roomUpdate` con eventos a cada jugador y programa las jugadas de los bots con retardo configurable.
- **Listo cuando:** hay pruebas con temporizador falso de que un bot juega cuando le toca y no antes.

### T16 · Desconexión y reconexión · M · `[x]`

- Al desconectarse, un bot toma el asiento; al volver con su token recupera el asiento y el bot se va. Si no queda ningún humano conectado, los bots se detienen y la sala se elimina tras un tiempo de espera.
- **Listo cuando:** hay pruebas del ciclo desconectar → bot juega → volver → el humano recupera el turno.

### T17 · Transporte WebSocket · M · `[x]`

- Servidor `ws` sobre el mismo servidor HTTP, validación con zod, límite de tamaño de mensaje, latido para detectar conexiones muertas y router de mensajes.
- **Listo cuando:** hay pruebas de mensaje inválido, conexión sin identificarse y reemplazo de una conexión vieja por una nueva.

### T18 · Listado de salas abiertas · S · `[x]`

- `GET /api/rooms` con las salas en espera que no están llenas.
- **Listo cuando:** una prueba confirma que no aparecen salas llenas ni en juego.

### T19 · Prueba de integración de punta a punta · M · `[x]`

- Cliente `ws` real: un humano más bots juegan una partida completa hasta el final.
- **Listo cuando:** la partida termina con ganador y nadie recibe un `error`.

> **Notas del hito M2:**
>
> - Un humano que se desconecta pasa a ser jugado por un bot; si vuelve con su token recupera el asiento. Quien sale a propósito en plena partida deja su asiento a un bot para siempre. Si no queda ningún humano conectado, los bots se detienen y la sala se cierra a los 5 minutos (`ROOM_IDLE_TIMEOUT_MS`).
> - No hay tiempo límite por turno.
> - Abrir la sesión en otra pestaña cierra la anterior (código `4001`).
> - Cada conexión puede enviar como máximo `MESSAGES_PER_SECOND` mensajes por segundo (30 por defecto); si lo supera se la cierra con `1008`.
> - Las pruebas de integración usan WebSockets reales contra el servidor completo.

---

## M3 · Interfaz (`frontend`)

### T20 · Esqueleto Vite + React · S · `[x]`

- Vite, React, TypeScript, CSS Modules, tokens de diseño (colores, tipografías, radios), fuentes y proxy de `/ws` y `/api` al backend.
- **Listo cuando:** `npm run dev -w frontend` muestra una página con los estilos base.

### T21 · Cliente WebSocket y estado · M · `[x]`

- `GameSocket` con reconexión y espera creciente, identificación automática con token guardado, reducer puro y proveedor de contexto.
- **Listo cuando:** hay pruebas del reducer con todos los tipos de mensaje.

### T22 · Nombre y lobby · M · `[x]`

- Pantalla de nombre, crear sala (2, 3 o 4 jugadores), unirse con código y lista de salas abiertas, según el diseño.
- **Listo cuando:** se puede crear y unirse a una sala desde dos pestañas.

### T23 · Sala de espera · S · `[x]`

- Código copiable, asientos, botón "Añadir bot" y "Empezar" solo para el anfitrión.
- **Listo cuando:** el anfitrión puede llenar la sala con bots y empezar.

### T24 · Componentes `Card` y `SuitIcon` · S · `[x]`

- Carta española con las cuatro pintas en SVG y estados normal, seleccionada, resaltada, última lanzada, atenuada y reverso.
- **Listo cuando:** una página de prueba muestra las 40 cartas y el reverso.

### T25 · Mesa: disposición, asientos y marcador · M · `[x]`

- Fieltro con asientos según el número de jugadores, jugador activo resaltado y marcador con barras hacia 24.
- **Listo cuando:** se ve bien con 2, 3 y 4 jugadores.

### T26 · Mano, vista previa de captura y jugar · M · `[x]`

- Elegir una carta y ver qué te llevarías (usa `findCapture` de `shared`), botón "Jugar" solo en tu turno.
- **Listo cuando:** se puede jugar una partida completa contra bots.

### T27 · Elección de orden y registro de jugadas · S · `[x]`

- Diálogo del repartidor para elegir 1-2-3-4 o 4-3-2-1, mensaje de espera para los demás y registro de jugadas en lenguaje natural.
- **Listo cuando:** hay pruebas de la función que convierte cada evento en texto.

### T28 · Cantos, resumen de baraja y fin de partida · M · `[x]`

- Avisos de canto de cada jugador con sus puntos pendientes, pantalla de conteo al acabar la baraja y pantalla de ganador.
- **Listo cuando:** se ve todo el ciclo hasta el final de una partida.

### T29 · Estado de conexión · S · `[x]`

- Aviso de "reconectando", indicador de jugadores reemplazados por bot y regreso automático a la partida al recargar la página.
- **Listo cuando:** recargar la pestaña a mitad de partida devuelve al mismo asiento.

### T30 · Diseño adaptable (móvil) · M · `[x]`

- Disposición para pantallas de 390 px según el diseño de mesa móvil.
- **Listo cuando:** la partida se puede jugar completa en un teléfono.

> **Notas del hito M3:**
>
> - **No se ha visto en un navegador real.** El entorno de trabajo no tenía navegador, así que la apariencia y la disposición móvil (T25, T30) están escritas siguiendo el diseño pero sin revisar a ojo. Lo verificado: tipos, lint, 114 pruebas de componentes y de lógica, la compilación de producción, y una prueba temporal en la que el cliente real (`GameSocket` + reductor) jugó una partida completa contra el servidor real.
> - Las cartas, el avatar, el botón y los diálogos son componentes reutilizables en `src/components`; cada pantalla vive en `src/features`.
> - Para el cliente se separaron los esquemas de `zod` (`shared/src/schemas.ts`) del resto del protocolo: el navegador no los carga (253 kB, 80 kB comprimido).
> - Las animaciones de las cartas no se incluyeron; el diseño no las pedía.

---

## M4 · Documentación y cierre

### T31 · README y reglas · S · `[ ]`

- `README.md` (instalación, scripts, estructura, protocolo) y `docs/REGLAS.md` con las reglas v1.
- **Listo cuando:** alguien nuevo puede levantar el proyecto siguiendo solo el README.

### T32 · Compilación de producción · S · `[x]`

- `npm run build` de ambos paquetes y el backend sirviendo el frontend compilado. Opcional: Dockerfile.
- **Listo cuando:** un solo proceso sirve la app compilada.

> **Notas de T32:** el servidor se compila con esbuild a un único archivo (`backend/dist/index.js`, con `@caida/shared` incluido) y, si se define `STATIC_DIR`, también sirve la web. Si esa carpeta no existe, el servidor falla al arrancar con un mensaje claro. Los pasos para Render están en `docs/DEPLOY.md`. T31 (README y `docs/REGLAS.md`) sigue pendiente.

---

## Fuera de la versión 1

Parejas · revancha tras terminar · cuentas y persistencia · chat · espectadores · cantos opcionales · apuestas.
