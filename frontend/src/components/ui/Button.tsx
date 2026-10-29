import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  const classes = [styles['button'], styles[variant], fullWidth && styles['full'], className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...rest} />;
}
