import { avatarColor, initialsOf } from '../../lib/format';
import styles from './Avatar.module.css';

interface AvatarProps {
  id: string;
  name: string;
  size?: 'sm' | 'md';
}

/** Círculo con las iniciales del jugador. Decorativo: el nombre siempre va escrito al lado. */
export function Avatar({ id, name, size = 'md' }: AvatarProps) {
  return (
    <span
      className={`${styles['avatar']} ${styles[size]}`}
      style={{ background: avatarColor(id) }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
