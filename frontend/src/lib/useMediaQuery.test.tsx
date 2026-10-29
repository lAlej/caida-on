import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from './useMediaQuery';

function mockMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return matches;
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
  return {
    set(value: boolean) {
      matches = value;
      for (const listener of listeners) listener();
    },
    listenerCount: () => listeners.size,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('devuelve si la consulta se cumple ahora', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'));
    expect(result.current).toBe(true);
  });

  it('se actualiza cuando cambia el tamaño de la ventana', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'));
    expect(result.current).toBe(false);

    act(() => media.set(true));
    expect(result.current).toBe(true);
  });

  it('deja de escuchar al desmontarse', () => {
    const media = mockMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 640px)'));
    expect(media.listenerCount()).toBe(1);
    unmount();
    expect(media.listenerCount()).toBe(0);
  });
});
