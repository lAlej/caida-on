import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  title: string;
  children: ReactNode;
  /** Si se pasa, Escape cierra el diálogo. Sin él, solo se cierra desde dentro. */
  onClose?: () => void;
}

/** Diálogo modal nativo: atrapa el foco y bloquea lo de detrás. */
export function Modal({ title, children, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles['modal']}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
    >
      <h2 id={titleId} className={styles['title']}>
        {title}
      </h2>
      {children}
    </dialog>
  );
}
