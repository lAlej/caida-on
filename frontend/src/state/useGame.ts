import { useContext } from 'react';
import { GameContext } from './GameContext';
import type { GameContextValue } from './GameContext';

export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame debe usarse dentro de <GameProvider>');
  return value;
}
