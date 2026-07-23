import { Buffer } from 'buffer';

import { Cardano } from '@cardano-sdk/core';
import { airGappedQrExchangeHook } from '@lace-contract/air-gapped-qr-exchange';
import { deriveDRepKeyHash } from '@lace-contract/cardano-context';
import {
  buildCip8Request,
  CardanoUrType,
  parseCip8Response,
  RequestId,
} from '@lace-lib/cardano-seed-signer-protocol';
import { HexBytes } from '@lace-lib/util';
import { from, map, switchMap } from 'rxjs';
import { v4 } from 'uuid';

import {
  fullDerivationPath,
  ROLE_DREP,
  ROLE_STAKE,
  xfpFromMasterFingerprint,
} from './seed-signer-paths';

import type { Cardano as CardanoTypes } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex, Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoDataSigner,
  CardanoSignDataRequest,
  CardanoSignDataResult,
  MasterFingerprint,
} from '@lace-contract/cardano-context';
import type { Observable } from 'rxjs';

export interface CardanoSeedSignerDataSignerProps {
  accountIndex: number;
  chainId: CardanoTypes.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  masterFingerprint?: MasterFingerprint;
  knownAddresses: GroupedAddress[];
}

interface ResolvedSigningTarget {
  role: number;
  index: number;
  addressBytes: Uint8Array;
}

/**
 * Signs CIP-8 data with an air-gapped Seed Signer by displaying the message as
 * an animated 'cardano-cip8-sig-req' QR and scanning the device's
 * 'cardano-cip8-sig-res' (COSE_Sign1 + COSE_Key). The host resolves the
 * role/index path (payment role 0, stake role 2, DRep role 3) and the address
 * bytes the device displays and binds the signature to.
 */
export class CardanoSeedSignerDataSigner implements CardanoDataSigner {
  readonly #props: CardanoSeedSignerDataSignerProps;

  public constructor(props: CardanoSeedSignerDataSignerProps) {
    this.#props = props;
  }

  public signData(
    request: CardanoSignDataRequest,
  ): Observable<CardanoSignDataResult> {
    return from(this.#resolveTarget(request)).pipe(
      switchMap(target => {
        const requestId = RequestId(v4());
        const signRequest = buildCip8Request({
          messagePayload: Buffer.from(request.payload, 'hex'),
          signingPath: {
            index: target.index,
            path: fullDerivationPath(
              this.#props.accountIndex,
              target.role,
              target.index,
            ),
          },
          addressBytes: target.addressBytes,
          xfp: xfpFromMasterFingerprint(this.#props.masterFingerprint),
          requestId,
        });

        return airGappedQrExchangeHook
          .trigger({
            request: { urType: signRequest.urType, cbor: signRequest.cbor },
            expectedResponseType: CardanoUrType.Cip8SignResponse,
          })
          .pipe(
            map(result => {
              const parsed = parseCip8Response(result.cbor);
              if (parsed.requestId !== requestId) {
                throw new Error(
                  `Seed signer returned a stale or mismatched response: expected request id ${requestId}, got ${parsed.requestId}`,
                );
              }
              return {
                signature: HexBytes(
                  Buffer.from(parsed.coseSign1).toString('hex'),
                ),
                key: HexBytes(Buffer.from(parsed.coseKey).toString('hex')),
              };
            }),
          );
      }),
    );
  }

  async #resolveTarget(
    request: CardanoSignDataRequest,
  ): Promise<ResolvedSigningTarget> {
    const address = Cardano.Address.fromString(request.signWith);
    if (!address) {
      throw new Error(`Invalid signWith address: ${request.signWith}`);
    }

    if (Cardano.isRewardAccount(request.signWith)) {
      const match = this.#props.knownAddresses.find(
        addr => addr.rewardAccount === request.signWith,
      );
      if (!match) {
        throw new Error(`Unknown signWith reward account: ${request.signWith}`);
      }
      return {
        role: match.stakeKeyDerivationPath?.role ?? ROLE_STAKE,
        index: match.stakeKeyDerivationPath?.index ?? 0,
        addressBytes: Buffer.from(address.toBytes(), 'hex'),
      };
    }

    const dRepKeyHash = await this.#deriveDRepKeyHash();
    if (
      address.getType() === Cardano.AddressType.EnterpriseKey &&
      address.getProps().paymentPart?.hash === dRepKeyHash
    ) {
      return {
        role: ROLE_DREP,
        index: 0,
        addressBytes: Buffer.from(address.getProps().paymentPart!.hash, 'hex'),
      };
    }

    const match = this.#props.knownAddresses.find(
      addr => addr.address === request.signWith,
    );
    if (!match) {
      throw new Error(`Unknown signWith address: ${request.signWith}`);
    }
    return {
      role: match.type,
      index: match.index,
      addressBytes: Buffer.from(address.toBytes(), 'hex'),
    };
  }

  async #deriveDRepKeyHash(): Promise<Ed25519KeyHashHex> {
    return deriveDRepKeyHash({
      accountIndex: this.#props.accountIndex,
      chainId: this.#props.chainId,
      extendedAccountPublicKey: this.#props.extendedAccountPublicKey,
    });
  }
}
