/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable no-magic-numbers */
import { Cardano, EraSummary } from '@cardano-sdk/core';
import { eraSlotDateTime } from '../era-slot-datetime';
import { fromSerializableObject } from '@cardano-sdk/util';

export const eraSummaries = fromSerializableObject<EraSummary[]>([
  {
    parameters: { epochLength: 4320, slotLength: 20_000 },
    start: { slot: 0, time: { __type: 'Date', value: 1_666_656_000_000 } }
  },
  {
    parameters: { epochLength: 86_400, slotLength: 1000 },
    start: { slot: 0, time: { __type: 'Date', value: 1_666_656_000_000 } }
  }
]);

const testSlot = Cardano.Slot(36_201_583);

describe('Testing eraSlotDateTime', () => {
  test('should return undefined', async () => {
    expect(eraSlotDateTime(undefined, testSlot)).toEqual(undefined);
  });
  test('should return undefined', async () => {
    expect(eraSlotDateTime(eraSummaries, undefined)).toEqual(undefined);
  });
  test('should return formatted time', async () => {
    expect(eraSlotDateTime(eraSummaries, testSlot)).toEqual({
      utcDate: '12/17/2023',
      utcTime: '23:59:43'
    });
  });
});
