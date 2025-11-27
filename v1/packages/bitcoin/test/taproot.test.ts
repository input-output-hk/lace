/* eslint-disable no-magic-numbers */
import { tweakTaprootPubKey, tweakTaprootPrivateKey } from '../src/wallet/lib/common/taproot';

// Test vectors from https://github.com/bitcoin/bips/blob/master/bip-0341/wallet-test-vectors.json
describe('Taproot key tweaking (BIP341)', () => {
  it('tweaks public key correctly with no merkle root', () => {
    const internalPubKey = Buffer.from('d6889cb081036e0faefa3a35157ad71086b123b2b144b649798b494c300a961d', 'hex');

    const tweaked = tweakTaprootPubKey(internalPubKey);
    const expected = '53a1f6e454df1aa2776a2814a721372d6258050de330b3c6d10ee8f4e0dda343';

    expect(tweaked.toString('hex')).toBe(expected);
  });

  it('tweaks private key correctly with internal pubkey', () => {
    const internalPubKey = Buffer.from('d6889cb081036e0faefa3a35157ad71086b123b2b144b649798b494c300a961d', 'hex');
    const privateKey = Buffer.from('00aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'hex');

    const tweakedPriv = tweakTaprootPrivateKey(privateKey, internalPubKey);

    const expected = 'b91926939e4655dd519d6aeee5666cbb9b9856b8d6fe7fac5e160eee2847171a';

    expect(tweakedPriv.toString('hex')).toBe(expected);
  });

  it('throws on invalid pubkey length', () => {
    const badKey = Buffer.alloc(31);
    expect(() => tweakTaprootPubKey(badKey)).toThrow('Internal public key must be 32 bytes (x-only format).');
  });

  it('throws if tweak fails (invalid pubkey)', () => {
    const zeroKey = Buffer.alloc(32, 0);
    expect(() => tweakTaprootPubKey(zeroKey)).toThrow('Expected Point');
  });
});
