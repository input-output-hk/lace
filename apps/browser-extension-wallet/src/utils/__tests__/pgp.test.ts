/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */

// Required for PGP function testing
const textEncoding = require('text-encoding-utf-8');
global.TextEncoder = textEncoding.TextEncoder;
global.TextDecoder = textEncoding.TextDecoder;

const {
  encryptMessageWithPgpAsBinaryFormat,
  getFingerprintFromPublicPgpKey,
  readPgpPublicKey,
  readPgpPrivateKey,
  readBinaryPgpMessage,
  decryptMessageWithPgp
} = require('../pgp');

// unmock the globally mocked pgp functions
jest.mock('../pgp', () => ({
  ...jest.requireActual<any>('../pgp')
}));

// All PGP examples, freely available from https://www.ietf.org/archive/id/draft-bre-openpgp-samples-01.html (not sensitive information)
const PGP_PUBLIC_KEY = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Comment: Alice's OpenPGP certificate
Comment: https://www.ietf.org/id/draft-bre-openpgp-samples-01.html

mDMEXEcE6RYJKwYBBAHaRw8BAQdArjWwk3FAqyiFbFBKT4TzXcVBqPTB3gmzlC/U
b7O1u120JkFsaWNlIExvdmVsYWNlIDxhbGljZUBvcGVucGdwLmV4YW1wbGU+iJAE
ExYIADgCGwMFCwkIBwIGFQoJCAsCBBYCAwECHgECF4AWIQTrhbtfozp14V6UTmPy
MVUMT0fjjgUCXaWfOgAKCRDyMVUMT0fjjukrAPoDnHBSogOmsHOsd9qGsiZpgRnO
dypvbm+QtXZqth9rvwD9HcDC0tC+PHAsO7OTh1S1TC9RiJsvawAfCPaQZoed8gK4
OARcRwTpEgorBgEEAZdVAQUBAQdAQv8GIa2rSTzgqbXCpDDYMiKRVitCsy203x3s
E9+eviIDAQgHiHgEGBYIACAWIQTrhbtfozp14V6UTmPyMVUMT0fjjgUCXEcE6QIb
DAAKCRDyMVUMT0fjjlnQAQDFHUs6TIcxrNTtEZFjUFm1M0PJ1Dng/cDW4xN80fsn
0QEA22Kr7VkCjeAEC08VSTeV+QFsmz55/lntWkwYWhmvOgE=
=iIGO
-----END PGP PUBLIC KEY BLOCK-----`;
const PGP_PUBLIC_KEY_FINGERPRINT = 'eb85bb5fa33a75e15e944e63f231550c4f47e38e';

const PGP_PRIVATE_KEY = `-----BEGIN PGP PRIVATE KEY BLOCK-----
Comment: Alice's OpenPGP Transferable Secret Key
Comment: https://www.ietf.org/id/draft-bre-openpgp-samples-01.html

lFgEXEcE6RYJKwYBBAHaRw8BAQdArjWwk3FAqyiFbFBKT4TzXcVBqPTB3gmzlC/U
b7O1u10AAP9XBeW6lzGOLx7zHH9AsUDUTb2pggYGMzd0P3ulJ2AfvQ4RtCZBbGlj
ZSBMb3ZlbGFjZSA8YWxpY2VAb3BlbnBncC5leGFtcGxlPoiQBBMWCAA4AhsDBQsJ
CAcCBhUKCQgLAgQWAgMBAh4BAheAFiEE64W7X6M6deFelE5j8jFVDE9H444FAl2l
nzoACgkQ8jFVDE9H447pKwD6A5xwUqIDprBzrHfahrImaYEZzncqb25vkLV2arYf
a78A/R3AwtLQvjxwLDuzk4dUtUwvUYibL2sAHwj2kGaHnfICnF0EXEcE6RIKKwYB
BAGXVQEFAQEHQEL/BiGtq0k84Km1wqQw2DIikVYrQrMttN8d7BPfnr4iAwEIBwAA
/3/xFPG6U17rhTuq+07gmEvaFYKfxRB6sgAYiW6TMTpQEK6IeAQYFggAIBYhBOuF
u1+jOnXhXpROY/IxVQxPR+OOBQJcRwTpAhsMAAoJEPIxVQxPR+OOWdABAMUdSzpM
hzGs1O0RkWNQWbUzQ8nUOeD9wNbjE3zR+yfRAQDbYqvtWQKN4AQLTxVJN5X5AWyb
Pnn+We1aTBhaGa86AQ==
=n8OM
-----END PGP PRIVATE KEY BLOCK-----`;

const HELLO_WORLD_BINARY_MESSAGE = new Uint8Array([
  193, 94, 3, 71, 102, 246, 185, 213, 242, 30, 182, 18, 1, 7, 64, 108, 134, 251, 250, 35, 9, 250, 92, 180, 92, 200, 198,
  211, 158, 47, 216, 164, 254, 160, 142, 7, 195, 173, 21, 54, 198, 157, 1, 124, 66, 50, 67, 48, 40, 193, 47, 115, 98,
  73, 207, 81, 75, 32, 15, 9, 235, 56, 143, 54, 117, 107, 184, 70, 201, 122, 45, 93, 141, 234, 108, 175, 147, 25, 147,
  49, 28, 154, 179, 123, 236, 200, 146, 107, 255, 173, 174, 55, 220, 115, 246, 208, 210, 59, 1, 12, 181, 80, 127, 144,
  93, 5, 83, 111, 112, 217, 210, 53, 246, 134, 102, 137, 19, 229, 86, 114, 37, 70, 21, 151, 13, 194, 184, 159, 123, 66,
  124, 160, 47, 104, 142, 165, 138, 156, 83, 241, 241, 183, 227, 58, 73, 7, 41, 131, 202, 137, 65, 172, 209, 211, 51,
  30, 207
]);

describe('PGP functions', () => {
  describe('getFingerprintFromPublicPgpKey', () => {
    it('should generate a fingerprint from a valid public key', async () => {
      expect(getFingerprintFromPublicPgpKey({ publicKeyArmored: PGP_PUBLIC_KEY })).resolves.toEqual(
        PGP_PUBLIC_KEY_FINGERPRINT
      );
    });

    it('should throw error if not a PGP public key', async () => {
      expect(getFingerprintFromPublicPgpKey({ publicKeyArmored: 'notpublickey' })).rejects.toThrowError(
        new Error('Misformed armored text')
      );
    });
  });

  describe('readPgpPublicKey', () => {
    it('should read a valid public key', async () => {
      const publicKey = await readPgpPublicKey({ publicKey: PGP_PUBLIC_KEY });
      expect(publicKey.getFingerprint()).toEqual(PGP_PUBLIC_KEY_FINGERPRINT);
    });

    it('should throw error if not a PGP public key', async () => {
      expect(readPgpPublicKey({ publicKey: 'notpublickey' })).rejects.toThrowError(new Error('Misformed armored text'));
    });

    it('should throw error if not a PGP public key', async () => {
      expect(readPgpPublicKey({ publicKey: PGP_PRIVATE_KEY })).rejects.toThrowError(new Error('PGP key is not public'));
    });

    it('should throw error if no key is supplied', async () => {
      expect(readPgpPublicKey({ publicKey: '' })).rejects.toThrow(
        'readKey: must pass options object containing `armoredKey` or `binaryKey`'
      );
    });
  });

  describe('readPgpPrivateKey', () => {
    it('should read a valid private key', async () => {
      expect((await readPgpPrivateKey({ privateKey: PGP_PRIVATE_KEY })).getUserIDs()).toEqual([
        'Alice Lovelace <alice@openpgp.example>'
      ]);
    });

    it('should throw and error if using a public key', async () => {
      expect(readPgpPrivateKey({ privateKey: PGP_PUBLIC_KEY })).rejects.toThrowError(
        'Armored text not of type private key'
      );
    });

    it('should throw and error if not a pgp key', async () => {
      expect(readPgpPrivateKey({ privateKey: 'notakey' })).rejects.toThrowError('Misformed armored text');
    });

    it('should indicate if the private key has a require passphrase', async () => {
      const readPrivateKey = await readPgpPrivateKey({ privateKey: PGP_PRIVATE_KEY });
      expect(readPrivateKey.keyPacket.isEncrypted).toBe(false);
    });
  });

  describe('readBinaryPgpMessage', () => {
    it('should read a binary pgp message', async () => {
      expect(readBinaryPgpMessage(HELLO_WORLD_BINARY_MESSAGE)).resolves.toBeInstanceOf(Object);
    });
  });

  describe('encryptMessageWithPgpAsBinaryFormat', () => {
    it('should encrypt a message in binary format', async () => {
      expect(
        encryptMessageWithPgpAsBinaryFormat({
          message: 'helloworld',
          publicKey: await readPgpPublicKey({ publicKey: PGP_PUBLIC_KEY })
        })
      ).resolves.toBeInstanceOf(Uint8Array);
    });
  });

  describe('decryptMessageWithPgp', () => {
    it('should decrypt a binary pgp message with private key', async () => {
      expect(
        decryptMessageWithPgp({
          message: await readBinaryPgpMessage(HELLO_WORLD_BINARY_MESSAGE),
          privateKey: await readPgpPrivateKey({ privateKey: PGP_PRIVATE_KEY })
        })
      ).resolves.toEqual('helloworld');
    });

    it('should decrypt a binary pgp message with private key and public verfication key', async () => {
      expect(
        decryptMessageWithPgp({
          message: await readBinaryPgpMessage(HELLO_WORLD_BINARY_MESSAGE),
          privateKey: await readPgpPrivateKey({ privateKey: PGP_PRIVATE_KEY }),
          publicKey: await readPgpPublicKey({ publicKey: PGP_PUBLIC_KEY })
        })
      ).resolves.toEqual('helloworld');
    });
  });
});
