import { Redacted } from '@lace-lib/util-redacted';
import { ByteArray, HexBytes } from '@lace-sdk/util';

import type { Tagged } from 'type-fest';

export type AuthSecret = Redacted<Tagged<ByteArray, 'AuthSecret'>>;

export const AuthSecret = (authSecret: ByteArray) =>
  Redacted.make(authSecret as Tagged<ByteArray, 'AuthSecret'>);

const fromUTF8 = (utf8string: string): AuthSecret =>
  AuthSecret(ByteArray.fromUTF8(utf8string));

const fromHex = (hex: HexBytes) => AuthSecret(HexBytes.toByteArray(hex));

AuthSecret.fromUTF8 = fromUTF8;
AuthSecret.fromHex = fromHex;
