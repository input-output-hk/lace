/* eslint-disable unicorn/no-null */
import { createMessage, decrypt, encrypt, readKey, readMessage, readPrivateKey, decryptKey } from 'openpgp';
import type { Key, MaybeArray, Message, PartialConfig, PrivateKey, PublicKey } from 'openpgp';
import { i18n } from '@lace/translation';
import { PublicPgpKeyData } from '@src/types';

export const WEAK_KEY_REGEX = new RegExp(/RSA keys shorter than 2047 bits are considered too weak./);

/**
 * Reads an armored PGP public key and returns the corresponding OpenPGP key object.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.publicKey - The armored PGP public key.
 * @param {openpgp.PartialConfig} [params.config] - Optional configuration for OpenPGP.
 * @returns {Promise<openpgp.Key>} The OpenPGP key object.
 * @throws Will throw an error if the public key cannot be read, has no encryption key, or is less than 2048 bits
 */
export const readPgpPublicKey = async ({
  publicKey,
  config
}: {
  publicKey: string;
  config?: PartialConfig;
}): Promise<Key> => {
  const readPublicKey: PublicKey = await readKey({ armoredKey: publicKey, config });
  if (readPublicKey.isPrivate()) {
    throw new Error('PGP key is not public');
  }
  const encryptionKey = await readPublicKey.getEncryptionKey();
  if (!encryptionKey) {
    throw new Error('no valid encryption key packet in key.');
  }

  return readPublicKey;
};

/**
 * Generates a fingerprint from an armored PGP public key.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.publicKeyArmored - The armored PGP public key.
 * @param {openpgp.PartialConfig} [params.config] - Optional configuration for OpenPGP.
 * @returns {Promise<string>} The fingerprint of the provided public key.
 * @throws Will throw an error if the public key cannot be read or if the fingerprint cannot be generated.
 */
export const getFingerprintFromPublicPgpKey = async ({
  publicKeyArmored,
  config
}: {
  publicKeyArmored: string;
  config?: PartialConfig;
}): Promise<string> => {
  const publicKey = await readPgpPublicKey({ publicKey: publicKeyArmored, config });
  return publicKey.getFingerprint();
};

/**
 * Reads an armored PGP private key and returns the corresponding OpenPGP private key object with an isEncrypted flag.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.privateKey - The armored PGP private key.
 * @returns {Promise<PgpPrivateKeyWithIsEncryptedFlag>} The OpenPGP private key object with an isEncrypted flag.
 * @throws Will throw an error if the private key cannot be read.
 */
export const readPgpPrivateKey = async ({ privateKey }: { privateKey: string }): Promise<PrivateKey> =>
  await readPrivateKey({ armoredKey: privateKey });

/**
 * Used to decrypt a private key shielded with a passphrase
 * @param {Object} params - function parameters
 * @param {PgpPrivateKeyWithIsEncryptedFlag} params.privateKey previously read PGP private key.
 * @param {string} params.passphrase passphrase used to decrypt the key
 */
export const decryptPgpPrivateKey = async ({
  privateKey,
  passphrase
}: {
  privateKey: PrivateKey;
  passphrase: string;
}): Promise<PrivateKey> =>
  await decryptKey({
    privateKey,
    passphrase
  });

/**
 * Reads a binary PGP message and returns the corresponding OpenPGP message object.
 *
 * @param {Uint8Array} message - The binary PGP message.
 * @returns {Promise<openpgp.Message>} The OpenPGP message object.
 * @throws Will throw an error if the message cannot be read.
 */
export const readBinaryPgpMessage = async (message: Uint8Array): Promise<Message<Uint8Array>> =>
  await readMessage({ binaryMessage: message });

/**
 * Encrypts a message using PGP and returns the encrypted message in binary format.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.message - The message to be encrypted.
 * @param {openpgp.PublicKey} params.publicKey - The public key for encryption.
 * @param {openpgp.MaybeArray<openpgp.PrivateKey>} [params.privateKeys] - Optional private keys for signing.
 * @returns {Promise<Uint8Array>} The encrypted message in binary format.
 * @throws Will throw an error if the message cannot be encrypted.
 */
export const encryptMessageWithPgpAsBinaryFormat = async ({
  message,
  publicKey,
  privateKeys
}: {
  message: string;
  publicKey: PublicKey;
  privateKeys?: MaybeArray<PrivateKey>;
}): Promise<Uint8Array> =>
  await encrypt({
    message: await createMessage({ text: message }),
    encryptionKeys: publicKey,
    signingKeys: privateKeys,
    format: 'binary',
    config: {
      deflateLevel: 9
    }
  });

/**
 * Decrypts a PGP message and optionally checks the signatures.
 *
 * @param {Object} params - The parameters for the function.
 * @param {openpgp.Message<Uint8Array>} params.message - The PGP message to be decrypted.
 * @param {openpgp.PublicKey} [params.publicKey] - The public key for verifying signatures.
 * @param {openpgp.PrivateKey} params.privateKey - The private key for decryption.
 * @param {boolean} [params.checkSignatures] - Optional flag to check signatures.
 * @returns {Promise<string>} The decrypted message.
 * @throws Will throw an error if the message cannot be decrypted or if signature verification fails.
 */
export const decryptMessageWithPgp = async ({
  message,
  publicKey,
  privateKey,
  checkSignatures = true
}: {
  message: Message<Uint8Array>;
  publicKey?: PublicKey;
  privateKey: PrivateKey;
  checkSignatures?: boolean;
}): Promise<string> => {
  const { data: decrypted, signatures } = await decrypt({
    message,
    verificationKeys: publicKey,
    decryptionKeys: privateKey
  });

  if (checkSignatures) {
    signatures.map((signature) => {
      if (!signature.verified) throw new Error(`signature ${signature.keyID} not verified`);
    });
  }
  return decrypted;
};

export const pgpPublicKeyVerification =
  (
    setPgpInfo: React.Dispatch<React.SetStateAction<PublicPgpKeyData>>,
    setValidation: React.Dispatch<
      React.SetStateAction<{
        error?: string;
        success?: string;
      }>
    >
  ): ((e: React.ChangeEvent<HTMLTextAreaElement>) => Promise<void>) =>
  async (e: React.ChangeEvent<HTMLTextAreaElement>): Promise<void> => {
    setValidation({ error: null, success: null });
    if (!e.target.value) return;
    try {
      const fingerPrint = await getFingerprintFromPublicPgpKey({ publicKeyArmored: e.target.value });
      setPgpInfo((prevState) => ({
        ...prevState,
        pgpPublicKey: e.target.value
      }));
      setValidation({
        error: null,
        success: fingerPrint
          .toUpperCase()
          .match(/.{1,4}/g)
          .join(' ')
      });
    } catch (error) {
      if (error.message === 'Misformed armored text') {
        setValidation({ error: i18n.t('pgp.error.misformedArmoredText') });
      } else if (error.message === 'no valid encryption key packet in key.') {
        setValidation({ error: i18n.t('pgp.error.noValidEncryptionKeyPacket') });
      } else if (WEAK_KEY_REGEX.test(error.message)) {
        setValidation({ error: error.message });
      } else if (error.message === 'PGP key is not public') {
        setValidation({ error: i18n.t('pgp.error.privateKeySuppliedInsteadOfPublic') });
      }
    }
  };
