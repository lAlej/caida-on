# Reglas de Caída Online (versión 1)

Reglas tal como las implementa el juego. Es la referencia del motor (`backend/src/game/CaidaGame.ts`): si el código y este documento no coinciden, es un error de uno de los dos.

## Resumen

Caída se juega de 2 a 4 personas, cada una por su cuenta, con baraja española de 40 cartas (sin 8 ni 9). Gana quien llegue primero a **24 puntos**.

- **Cartas:** 1, 2, 3, 4, 5, 6, 7, Sota (10), Caballo (11) y Rey (12), en oros, copas, espadas y bastos. El orden de valores es 1-2-3-4-5-6-7-10-11-12, así que después del 7 viene el 10.
- **Mano:** cada reparto de 3 cartas por jugador. **Baraja:** una pasada completa por las 40 cartas, que se reparte en varias manos.
- **Sentido:** el juego va hacia la derecha.
- **Puntos:** vienen de jugadas al instante (caída, mesa limpia), de cantos al cerrar la mano y de las cartas ganadas al acabarse la baraja.
- **Versión 1:** solo individual, sin parejas.

## Reparto

Cada baraja empieza con la entrega de la mesa, y después se reparten 3 cartas a cada jugador. El primer repartidor se sortea; en las barajas siguientes reparte quien esté a la derecha del repartidor anterior.

**Entrega de la mesa** (solo al empezar cada baraja):

1. El repartidor elige el orden: 1-2-3-4 o 4-3-2-1. No hay otros.
2. Se voltean 4 cartas a la mesa, una por número dicho.
3. Cada carta que coincide con su número le da al repartidor ese número de puntos. Si acierta el 1 y el 3, suma 4.
4. Se reparten 3 cartas a cada jugador, incluido él.

**Casos especiales:**

- **Mal echada:** ninguna carta coincide con su número. El primer jugador (el de la derecha del repartidor) gana 1 punto.
- **Carta repetida en la mesa:** si sale un valor que ya está en la mesa, esa segunda carta vuelve al mazo y se saca otra en su lugar. Nunca hay dos cartas del mismo valor en la mesa.

## Turnos y capturas

En tu turno juegas una carta de tu mano. Si en la mesa hay una carta del mismo valor, la capturas automáticamente; si no, la carta queda en la mesa. En la primera mano de cada baraja empieza el jugador a la derecha del repartidor; en cada mano siguiente empieza el siguiente hacia la derecha. Dentro de una mano el turno sigue hacia la derecha.

- **Lanzar:** la carta queda al final de la mesa.
- **Capturar:** es automático. Si en la mesa hay una carta del mismo valor que la que juegas, te llevas esa carta más todas las consecutivas hacia arriba que haya en la mesa, estén donde estén. Con un 5 y un 5, 6 y 7 en la mesa te llevas las tres. Con 5, 6 y 10 solo te llevas el 5 y el 6, porque falta el 7.
- **Orden de la cadena:** 1-2-3-4-5-6-7-10-11-12. Después del 7 sigue el 10.
- **Caer:** si capturas la carta que el jugador anterior acaba de lanzar, es una caída y suma puntos. Capturar una carta más vieja no da puntos de caída. La caída solo cuenta dentro de la misma mano: la última carta que se lanza en una mano no se puede caer al empezar la siguiente.
- **Desconexión:** si un jugador se desconecta, un bot juega por él con decisiones al azar. Si vuelve a entrar, recupera su lugar y el bot se va. No hay tiempo límite por turno.

## Puntos inmediatos

Estos puntos se suman en el momento de la jugada y pueden ganar la partida al instante.

| Jugada          | Qué pasa                                                 | Puntos     |
| --------------- | -------------------------------------------------------- | ---------- |
| Caída de 1 al 7 | Capturas la carta recién lanzada por el jugador anterior | 1          |
| Caída de 10     | Igual                                                    | 2          |
| Caída de 11     | Igual                                                    | 3          |
| Caída de 12     | Igual                                                    | 4          |
| Mesa limpia     | Tu captura deja la mesa sin cartas                       | 4          |
| Caída con mesa  | Tu caída deja la mesa sin cartas                         | 5 en total |

La caída con mesa vale 5 en total: no se suma a los puntos de la caída ni a los de mesa limpia.

## Cantos

Los cantos se detectan solos al repartir, se anuncian a todos y no se pueden declarar ni cambiar. En cada mano solo puntúa el canto más alto de toda la mesa, y sus puntos se suman cuando se acaban las cartas de la mano.

| Canto    | Cartas                                                | Puntos                             | Se da en            |
| -------- | ----------------------------------------------------- | ---------------------------------- | ------------------- |
| Ronda    | Dos iguales y una distinta (sin ser Vigía)            | 1 al 7 → 1, 10 → 2, 11 → 3, 12 → 4 | 17,5 % de las manos |
| Patrulla | Tres consecutivas en el orden de valores, como 6-7-10 | 6                                  | 5,18 %              |
| Vigía    | Pareja y una carta vecina, como 7-7-10 o 7-7-6        | 7                                  | 4,37 %              |
| Registro | 1, 11 y 12                                            | 8                                  | 0,65 %              |
| Trivilín | Tres iguales                                          | 12                                 | 0,40 %              |

Una mano cuenta solo como su canto más alto: 7-7-10 es Vigía, no Ronda. El 72 % de las manos no trae ningún canto. El Trivilín no gana la partida por sí solo: vale 12 puntos, se suma al cerrar la mano y entre dos Trivilines gana el de mayor valor.

**Cuando dos jugadores tienen el mismo canto:**

1. Gana el de mayor valor. Una ronda de 7 (7-7-1) le gana a una de 2 (2-2-12). En Patrulla y Vigía gana la carta o pareja más alta.
2. Si siguen empatados en una ronda, gana la tercera carta más alta.
3. Si aún hay empate, gana quien esté más cerca a la derecha del repartidor.

## Cierre de mano y de baraja

Cuando los jugadores se quedan sin cartas, la mano termina y se suman los puntos del canto ganador. Si queda mazo, se reparten otras 3 cartas a cada uno, sin nuevas cartas en la mesa.

Al terminar la última mano de la baraja:

1. Se suman los puntos del canto ganador de esa mano.
2. Las cartas que quedaron en la mesa se las lleva quien capturó último.
3. Se cuentan las cartas ganadas. Cada carta por encima del número de su jugador vale 1 punto; quien tiene menos no resta.

| Jugadores | Manos por baraja | Cada uno cuenta hasta              |
| --------- | ---------------- | ---------------------------------- |
| 2         | 6                | 20 cartas                          |
| 3         | 4                | 14 el repartidor, 13 los otros dos |
| 4         | 3                | 10 cartas                          |

Ejemplo con 2 jugadores: uno termina con 25 cartas y el otro con 15. El primero suma 5 puntos y el segundo ninguno.

Si nadie llega a 24, se baraja de nuevo y empieza otra baraja con su entrega de mesa. Reparte quien esté a la derecha del repartidor anterior.

## Victoria y empates

Gana quien llegue primero a 24 puntos o más. Los puntos se revisan en este orden, y el primer momento en que alguien llega a 24 decide la partida:

1. **Al instante:** entrega de la mesa, mal echada, caída, mesa limpia y caída con mesa.
2. **Al cerrar cada mano:** puntos del canto ganador. Solo puntúa un canto por mano, así que aquí no hay empate.
3. **Al acabar la baraja:** conteo de cartas. Si varios jugadores llegan o pasan de 24 en este paso, gana el que tenga más puntos. Si empatan, se elige uno al azar entre los empatados.

## Fuera de la versión 1

Canto mata mesa, zapatero, apuestas, cantos fingidos (mentir), cantos opcionales (Registríco, Casa Chica, Casa Grande), parejas y tiempo límite por turno.

---

## Cómo lo implementa el código

| Regla                                          | Dónde                           |
| ---------------------------------------------- | ------------------------------- |
| Baraja, valores y su orden                     | `shared/src/cards.ts`           |
| Cadena de captura                              | `shared/src/capture.ts`         |
| Puntos de caída, mesa limpia, conteo y manos   | `shared/src/scoring.ts`         |
| Detección, puntos y jerarquía de los cantos    | `shared/src/canto.ts`           |
| Flujo de la partida (reparto, turnos, cierres) | `backend/src/game/CaidaGame.ts` |
| Bots                                           | `backend/src/bots/randomBot.ts` |
| Salas, bots por desconexión y regreso          | `backend/src/rooms/Room.ts`     |

El servidor es quien decide: el cliente solo muestra una vista previa de la jugada con las mismas funciones de `shared`.

### Detalles de la implementación que el reglamento no fija

- **Primer repartidor:** el sistema lo sortea; no se muestran cartas.
- **Orden del reparto:** la mesa siempre se entrega primero. No se ofrece repartir antes a los jugadores.
- **Desempate de cantos:** la cercanía se mide desde la derecha del **repartidor**, no desde quien abre la mano.
- **Mesa limpia en la última jugada:** cuenta (+4), igual que en cualquier otra captura.
- **Con 4 jugadores** una baraja tiene solo 3 manos, así que el repartidor no llega a abrir ninguna mano de esa baraja.
- **Con 2 jugadores** la rotación hace que quien lanza la última carta de una mano abra la siguiente.
- **Quien sale** de una partida en curso deja su asiento a un bot para siempre; solo vuelve quien se desconectó sin salir.
