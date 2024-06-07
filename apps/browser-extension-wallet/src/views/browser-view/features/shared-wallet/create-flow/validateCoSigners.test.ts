import { CoSignerError, CoSignerErrorKeys, CoSignerErrorName } from '@lace/core';
import { validateCoSigners } from './validateCoSigners';

const fakeKeys = 'addr_shared_vksdhgfsft578s6tf68tdsf,stake_shared_vkgyufieus65cuv76s5vrs7';

describe('validateCoSigners', () => {
  test('name duplicated', () => {
    expect(
      validateCoSigners([
        { id: '1', name: 'John Doe', keys: fakeKeys },
        { id: '2', name: 'John Doe', keys: fakeKeys }
      ])
    ).toEqual([
      { id: '1', name: CoSignerErrorName.Duplicated },
      { id: '2', name: CoSignerErrorName.Duplicated }
    ] as CoSignerError[]);
  });

  test('name empty', () => {
    expect(validateCoSigners([{ id: '1', name: '', keys: fakeKeys }])).toEqual([
      { id: '1', name: CoSignerErrorName.Required }
    ] as CoSignerError[]);
  });

  test('name to long', () => {
    expect(validateCoSigners([{ id: '1', name: '123456789012345678901', keys: fakeKeys }])).toEqual([
      { id: '1', name: CoSignerErrorName.TooLong }
    ] as CoSignerError[]);
  });

  test('keys empty', () => {
    expect(validateCoSigners([{ id: '1', name: 'John Doe', keys: '' }])).toEqual([
      { id: '1', keys: CoSignerErrorKeys.Required }
    ] as CoSignerError[]);
  });

  test('keys incorrect', () => {
    expect(validateCoSigners([{ id: '1', name: 'John Doe', keys: 'incorrect' }])).toEqual([
      { id: '1', keys: CoSignerErrorKeys.Invalid }
    ] as CoSignerError[]);
  });

  test('no errors', () => {
    expect(validateCoSigners([{ id: '1', name: 'John Doe', keys: fakeKeys }])).toEqual([] as CoSignerError[]);
  });

  test('two errors on a single co-signer', () => {
    expect(
      validateCoSigners([
        { id: '1', name: '123456789012345678901', keys: fakeKeys },
        { id: '2', name: 'John Doe', keys: 'incorrect' }
      ])
    ).toEqual([
      { id: '1', name: CoSignerErrorName.TooLong },
      { id: '2', keys: CoSignerErrorKeys.Invalid }
    ] as CoSignerError[]);
  });
});
