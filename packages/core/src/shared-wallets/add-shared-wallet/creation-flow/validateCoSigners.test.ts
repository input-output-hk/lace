import { CoSignerError, CoSignerErrorKeys, CoSignerErrorName } from './AddCoSigners';
import { validateCoSigners } from './validateCoSigners';

const fakeKeys =
  '979693650bb44f26010e9f7b3b550b0602c748d1d00981747bac5c34cf5b945fe01a39317b9b701e58ee16b5ed16aa4444704b98cc997bdd6c5a9502a8b7d70d';

describe('validateCoSigners', () => {
  test('name duplicated', () => {
    expect(
      validateCoSigners([
        { id: '1', keys: fakeKeys, name: 'John Doe' },
        { id: '2', keys: fakeKeys, name: 'John Doe' },
      ]),
    ).toEqual([
      { id: '1', name: CoSignerErrorName.Duplicated },
      { id: '2', name: CoSignerErrorName.Duplicated },
    ] as CoSignerError[]);
  });

  test('name empty', () => {
    expect(validateCoSigners([{ id: '1', keys: fakeKeys, name: '' }])).toEqual([
      { id: '1', name: CoSignerErrorName.Required },
    ] as CoSignerError[]);
  });

  test('name to long', () => {
    expect(validateCoSigners([{ id: '1', keys: fakeKeys, name: '123456789012345678901' }])).toEqual([
      { id: '1', name: CoSignerErrorName.TooLong },
    ] as CoSignerError[]);
  });

  test('keys empty', () => {
    expect(validateCoSigners([{ id: '1', keys: '', name: 'John Doe' }])).toEqual([
      { id: '1', keys: CoSignerErrorKeys.Required },
    ] as CoSignerError[]);
  });

  test('keys incorrect', () => {
    expect(validateCoSigners([{ id: '1', keys: 'incorrect', name: 'John Doe' }])).toEqual([
      { id: '1', keys: CoSignerErrorKeys.Invalid },
    ] as CoSignerError[]);
  });

  test('no errors', () => {
    expect(validateCoSigners([{ id: '1', keys: fakeKeys, name: 'John Doe' }])).toEqual([] as CoSignerError[]);
  });

  test('two errors on a single co-signer', () => {
    expect(
      validateCoSigners([
        { id: '1', keys: fakeKeys, name: '123456789012345678901' },
        { id: '2', keys: 'incorrect', name: 'John Doe' },
      ]),
    ).toEqual([
      { id: '1', name: CoSignerErrorName.TooLong },
      { id: '2', keys: CoSignerErrorKeys.Invalid },
    ] as CoSignerError[]);
  });
});
