import { errors } from '../src';

describe('key-management errors', () => {
  it('format their messages with and without detail', () => {
    expect(new errors.AuthenticationError().message).toBe(
      'Authentication failure',
    );
    expect(new errors.AuthenticationError('bad passphrase').message).toBe(
      'Authentication failure: bad passphrase',
    );
    const invalidMnemonic = new errors.InvalidMnemonicError();
    expect(invalidMnemonic.message).toBe('Invalid Mnemonic');
    expect(invalidMnemonic.name).toBe('InvalidMnemonicError');
    expect(new errors.InvalidSerializableDataError().message).toContain(
      'Invalid serializable key agent data',
    );
    expect(new errors.TransportError('disconnected').message).toContain(
      'disconnected',
    );
    expect(new errors.HwMappingError('unsupported').message).toContain(
      'unsupported',
    );
    expect(new errors.ProofGenerationError('no key').message).toContain(
      'no key',
    );
  });

  it('keep the inner error', () => {
    const inner = new Error('usb');
    expect(new errors.TransportError('disconnected', inner).innerError).toBe(
      inner,
    );
  });
});
