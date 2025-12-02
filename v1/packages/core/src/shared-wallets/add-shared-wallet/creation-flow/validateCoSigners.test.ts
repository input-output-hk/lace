import { CoSignerError, CoSignerErrorKeys, CoSignerErrorName } from './AddCoSigners';
import { validateCoSigners } from './validateCoSigners';

const fakeSharedKey =
  'acct_shared_xvk1q395kywke7mufrysg33nsm6ggjxswu4g8q8ag7ks9kdyaczchtemd5d2armrfstfa32lamhxfl3sskgcmxm4zdhtvut362796ez4ecqx6vnht';

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
