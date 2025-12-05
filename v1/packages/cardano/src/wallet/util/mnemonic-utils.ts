import * as KeyManagement from '@cardano-sdk/key-management';

export const clearBytes = (bytes: Uint8Array): void => {
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = 0;
  }
};

export const decryptMnemonic = async (encryptedKeyMaterial: string, passphrase: Uint8Array): Promise<string[]> => {
  const keyMaterialBytes = await KeyManagement.emip3decrypt(
    new Uint8Array(Buffer.from(encryptedKeyMaterial, 'hex')),
    passphrase
  );
  const mnemonic = Buffer.from(keyMaterialBytes).toString('utf8').split(' ');
  clearBytes(keyMaterialBytes);
  return mnemonic;
};
