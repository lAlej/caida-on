export type CancelTimer = () => void;

/** Programa una función para más tarde. Se inyecta para poder controlar el tiempo en las pruebas. */
export type Scheduler = (callback: () => void, delayMs: number) => CancelTimer;

export const realScheduler: Scheduler = (callback, delayMs) => {
  const timer = setTimeout(callback, delayMs);
  return () => clearTimeout(timer);
};
