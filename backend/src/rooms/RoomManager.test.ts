import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../game/random';
import { silentLogger } from '../logger';
import { generateRoomCode } from './codes';
import { RoomManager } from './RoomManager';
import { FakeScheduler } from './testHelpers';

const ANA = { playerId: 'ana', name: 'Ana' };
const BETO = { playerId: 'beto', name: 'Beto' };

function createManager(newCode?: () => string) {
  const closedCodes: string[] = [];
  const manager = new RoomManager(
    {
      random: createSeededRandom(1),
      botDelayMs: 0,
      idleTimeoutMs: 1000,
      logger: silentLogger,
      schedule: new FakeScheduler().schedule,
      publish: () => undefined,
    },
    (room) => closedCodes.push(room.code),
    newCode,
  );
  return { manager, closedCodes };
}

describe('generateRoomCode', () => {
  it('genera códigos de 4 caracteres sin letras ni dígitos confusos', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateRoomCode()).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    }
  });
});

describe('RoomManager', () => {
  it('crea una sala y la encuentra por código sin importar mayúsculas', () => {
    const { manager } = createManager(() => 'K7QX');
    const room = manager.create(ANA, 4);
    expect(manager.get('K7QX')).toBe(room);
    expect(manager.get('k7qx')).toBe(room);
    expect(manager.get('ZZZZ')).toBeUndefined();
  });

  it('no repite códigos', () => {
    const codes = ['AAAA', 'AAAA', 'BBBB'];
    const { manager } = createManager(() => codes.shift() as string);
    const first = manager.create(ANA, 4);
    const second = manager.create(BETO, 4);
    expect([first.code, second.code]).toEqual(['AAAA', 'BBBB']);
  });

  it('falla si no consigue un código libre', () => {
    const { manager } = createManager(() => 'AAAA');
    manager.create(ANA, 4);
    expect(() => manager.create(BETO, 4)).toThrowError(/código/);
  });

  it('lista solo las salas abiertas, las más nuevas primero', () => {
    const codes = ['AAAA', 'BBBB', 'CCCC'];
    const { manager } = createManager(() => codes.shift() as string);
    manager.create(ANA, 4);
    const full = manager.create(BETO, 2);
    full.addBot('beto');
    const started = manager.create({ playerId: 'carla', name: 'Carla' }, 4);
    started.addBot('carla');
    started.start('carla');

    expect(manager.listOpen().map((room) => room.code)).toEqual(['AAAA']);
  });

  it('elimina la sala y avisa cuando se cierra', () => {
    const { manager, closedCodes } = createManager(() => 'K7QX');
    const room = manager.create(ANA, 4);
    room.leave('ana');

    expect(manager.get('K7QX')).toBeUndefined();
    expect(closedCodes).toEqual(['K7QX']);
    expect(manager.listOpen()).toEqual([]);
  });

  it('closeAll olvida todas las salas', () => {
    const codes = ['AAAA', 'BBBB'];
    const { manager } = createManager(() => codes.shift() as string);
    manager.create(ANA, 4);
    manager.create(BETO, 4);
    manager.closeAll();
    expect(manager.listOpen()).toEqual([]);
  });
});
