import type { PlayerId } from '@caida/shared';
import type { LogEntry } from '../../state/reducer';
import { describeEvent } from './eventText';
import styles from './EventLog.module.css';

interface EventLogProps {
  entries: readonly LogEntry[];
  nameOf: (playerId: PlayerId) => string;
}

const VISIBLE_ENTRIES = 14;

/** Últimas jugadas, la más reciente arriba. */
export function EventLog({ entries, nameOf }: EventLogProps) {
  const recent = entries.slice(-VISIBLE_ENTRIES).reverse();

  return (
    <section className={styles['panel']} aria-labelledby="log-title">
      <h2 id="log-title" className={styles['title']}>
        Jugadas
      </h2>
      {recent.length === 0 ? (
        <p className={styles['empty']}>Todavía no ha pasado nada.</p>
      ) : (
        <ul className={styles['list']} role="log">
          {recent.map((entry) => (
            <li key={entry.id} className={styles['item']}>
              {describeEvent(entry.event, nameOf)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
