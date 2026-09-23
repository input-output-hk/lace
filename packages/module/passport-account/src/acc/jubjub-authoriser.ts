import { DeviceCommitmentHex } from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

import { UnknownCircuitError } from './artefact-loader';
import { jubjubChallenges } from './challenges';

import type { CallContext, ChallengeBuilder } from './challenges';
import type { JubjubDevice } from './signer';
import type {
  AccAddress,
  AuthorisationRequest,
  PassportAuthoriser,
} from '@lace-contract/passport';
import type { JubjubPoint } from '@midnight-ntwrk/compact-runtime';

const HEX_BYTE_PATTERN = /^(?:[0-9a-f]{2})*$/;

const accountToBytes = (account: AccAddress): Uint8Array => {
  if (!HEX_BYTE_PATTERN.test(account)) {
    throw new Error(
      `AccAddress is not lowercase hex of whole bytes: "${account}"`,
    );
  }
  return ByteArray.fromHex(HexBytes(account));
};

const bytesArgument = (request: AuthorisationRequest): Uint8Array => {
  const [entry] = request.args;
  if (!(entry instanceof Uint8Array)) {
    throw new Error(
      `Circuit ${request.circuit} expects a byte-array entry as its first argument`,
    );
  }
  return entry;
};

const challengeBuilders: Record<
  string,
  (
    context: CallContext,
    pk: JubjubPoint,
    request: AuthorisationRequest,
  ) => ChallengeBuilder
> = {
  add_device_with_jubjub: (context, pk, request) =>
    jubjubChallenges.addDevice(context, pk, bytesArgument(request)),
  remove_device_with_jubjub: (context, pk, request) =>
    jubjubChallenges.removeDevice(context, pk, bytesArgument(request)),
};

/**
 * Runs one authoriser operation against a JubjubDevice the key source
 * supplies. The runner owns the device lifetime: a passkey source builds
 * a fresh device per call and disposes it afterwards, while the dev
 * source reuses one in-memory device.
 */
export type JubjubDeviceRunner = <T>(
  operation: (device: JubjubDevice) => T,
) => Promise<T>;

/**
 * A PassportAuthoriser that always implements the optional batched
 * deviceCommitments lookup.
 */
export type JubjubAuthoriser = PassportAuthoriser &
  Required<Pick<PassportAuthoriser, 'deviceCommitments'>>;

/**
 * A PassportAuthoriser over any JubJub device key source. Authorises the
 * device-management circuits this module calls and rejects everything
 * else, including the permissionless
 * `activate_initial_device_with_jubjub`, which needs no authorisation.
 */
export const createJubjubAuthoriser = (
  runWithDevice: JubjubDeviceRunner,
): JubjubAuthoriser => ({
  scheme: 'jubjub-schnorr',

  deviceCommitment: async (account, epoch, counter) =>
    runWithDevice(device =>
      DeviceCommitmentHex(
        HexBytes.fromByteArray(
          device.entryAt(accountToBytes(account), epoch, counter),
        ),
      ),
    ),

  deviceCommitments: async (account, epoch, counters) =>
    runWithDevice(device => {
      const accountBytes = accountToBytes(account);
      return counters.map(counter =>
        DeviceCommitmentHex(
          HexBytes.fromByteArray(device.entryAt(accountBytes, epoch, counter)),
        ),
      );
    }),

  devicePublicKey: async () => runWithDevice(device => device.pk),

  authorise: async request =>
    runWithDevice(device => {
      const toBuilder = challengeBuilders[request.circuit];
      if (!toBuilder) throw new UnknownCircuitError(request.circuit);

      const context: CallContext = {
        contractAddress: accountToBytes(request.account),
        authNonce: request.authNonce,
      };
      return device.sign(
        toBuilder(context, device.pk, request),
        request.useCounter,
      );
    }),
});
