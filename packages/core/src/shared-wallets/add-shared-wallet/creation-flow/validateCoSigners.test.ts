import { CoSignerError, CoSignerErrorKeys, CoSignerErrorName } from './AddCoSigners';
import { validateCoSigners } from './validateCoSigners';

const fakeSharedKey =
  '979693650bb44f26010e9f7b3b550b0602c748d1d00981747bac5c34cf5b945fe01a39317b9b701e58ee16b5ed16aa4444704b98cc997bdd6c5a9502a8b7d70d';

describe('validateCoSigners', () => {
  test('name duplicated', () => {
    expect(
      validateCoSigners([
        { id: '1', name: 'John Doe', sharedWalletKey: fakeSharedKey },
        { id: '2', name: 'John Doe', sharedWalletKey: fakeSharedKey },
      ]),
    ).toEqual([
      { id: '1', name: CoSignerErrorName.Duplicated, sharedWalletKey: CoSignerErrorKeys.Duplicated },
      { id: '2', name: CoSignerErrorName.Duplicated, sharedWalletKey: CoSignerErrorKeys.Duplicated },
    ] as CoSignerError[]);
  });

  test('name empty', () => {
    expect(validateCoSigners([{ id: '1', name: '', sharedWalletKey: fakeSharedKey }])).toEqual([
      { id: '1', name: CoSignerErrorName.Required },
    ] as CoSignerError[]);
  });

  test('name to long', () => {
    expect(validateCoSigners([{ id: '1', name: '123456789012345678901', sharedWalletKey: fakeSharedKey }])).toEqual([
      { id: '1', name: CoSignerErrorName.TooLong },
    ] as CoSignerError[]);
  });

  test('sharedWalletKey empty', () => {
    expect(validateCoSigners([{ id: '1', name: 'John Doe', sharedWalletKey: '' }])).toEqual([
      { id: '1', sharedWalletKey: CoSignerErrorKeys.Required },
    ] as CoSignerError[]);
  });

  test('sharedWalletKey incorrect', () => {
    expect(validateCoSigners([{ id: '1', name: 'John Doe', sharedWalletKey: 'incorrect' }])).toEqual([
      { id: '1', sharedWalletKey: CoSignerErrorKeys.Invalid },
    ] as CoSignerError[]);
  });

  test('no errors', () => {
    expect(validateCoSigners([{ id: '1', name: 'John Doe', sharedWalletKey: fakeSharedKey }])).toEqual(
      [] as CoSignerError[],
    );
  });

  test('two errors on a single co-signer', () => {
    expect(
      validateCoSigners([
        { id: '1', name: '123456789012345678901', sharedWalletKey: fakeSharedKey },
        { id: '2', name: 'John Doe', sharedWalletKey: 'incorrect' },
      ]),
    ).toEqual([
      { id: '1', name: CoSignerErrorName.TooLong },
      { id: '2', sharedWalletKey: CoSignerErrorKeys.Invalid },
    ] as CoSignerError[]);
  });
});
