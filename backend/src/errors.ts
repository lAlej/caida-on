import type { ErrorCode } from '@caida/shared';

/** Error esperado que se le comunica al cliente con un código estable. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
