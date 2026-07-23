import { airGappedQrExchangeHook } from '@lace-contract/air-gapped-qr-exchange';
import { bitcoinFullDerivationPath } from '@lace-contract/bitcoin-context';
import {
  BitcoinUrType,
  encodeSignRequest,
  parseSignResponse,
} from '@lace-lib/bitcoin-air-gapped-protocol';
import { HexBytes } from '@lace-lib/util';
import * as bitcoin from 'bitcoinjs-lib';
import { defer, map } from 'rxjs';

import type {
  BitcoinSignRequest,
  BitcoinSignResult,
  BitcoinTransactionSigner,
  BitcoinUnsignedTxDto,
} from '@lace-contract/bitcoin-context';
import type { Observable } from 'rxjs';

/**
 * Props addressing a Bitcoin Seed Signer account at the device seed. The device
 * master fingerprint (xfp) stamps every owned input's key-origin so the stock
 * SeedSigner can match and sign its keys.
 */
export interface BitcoinSeedSignerTransactionSignerProps {
  masterFingerprint?: string;
}

/**
 * Signs a Bitcoin transaction with an air-gapped Seed Signer. Builds the
 * unsigned PSBT, stamps each owned input with a BIP-32 key-origin (the device
 * xfp + the full native-segwit path m/84'/coin'/account'/chain/index) so the
 * stock SeedSigner recognizes its inputs, displays the PSBT as a crypto-psbt
 * animated QR, scans the device's signed crypto-psbt, then finalizes and
 * extracts the signed transaction. No private keys leave the device and the
 * PSBT body is not mutated beyond adding key-origins.
 */
export class BitcoinSeedSignerTransactionSigner
  implements BitcoinTransactionSigner
{
  readonly #masterFingerprint?: string;

  public constructor(props: BitcoinSeedSignerTransactionSignerProps) {
    this.#masterFingerprint = props.masterFingerprint;
  }

  public sign(request: BitcoinSignRequest): Observable<BitcoinSignResult> {
    return defer(() => {
      const built = this.#buildRequest(request.serializedTx);
      return airGappedQrExchangeHook
        .trigger({
          request: { urType: BitcoinUrType.Psbt, cbor: built.requestCbor },
          expectedResponseType: BitcoinUrType.Psbt,
          chainType: 'Bitcoin',
        })
        .pipe(map(result => this.#applySignedPsbt(result.cbor, built)));
    });
  }

  /**
   * Decodes the unsigned PSBT, stamps each input's BIP-32 key-origin with the
   * device xfp + full native-segwit path, and encodes the result as a
   * crypto-psbt request with every input's nonWitnessUtxo stripped. The
   * returned requestPsbt keeps its full input data for the later
   * combine/finalize step.
   */
  #buildRequest(serializedTx: HexBytes): {
    requestCbor: Uint8Array;
    network?: string;
    requestPsbt: bitcoin.Psbt;
  } {
    const dto = JSON.parse(
      HexBytes.toUTF8(serializedTx),
    ) as BitcoinUnsignedTxDto;
    const psbt = bitcoin.Psbt.fromHex(dto.context);
    const fingerprint = this.#fingerprintBytes();

    dto.signers.forEach((signer, inputIndex) => {
      psbt.updateInput(inputIndex, {
        bip32Derivation: [
          {
            masterFingerprint: fingerprint,
            pubkey: Buffer.from(signer.publicKeyHex, 'hex'),
            path: bitcoinFullDerivationPath({
              addressType: signer.addressType,
              network: signer.network,
              account: signer.account,
              chain: signer.chain,
              index: signer.index,
            }),
          },
        ],
      });
    });

    return {
      requestCbor: encodeSignRequest(this.#toQrRequestBytes(psbt)).cbor,
      network: dto.network,
      requestPsbt: psbt,
    };
  }

  /**
   * Serializes the PSBT for the QR request with every input's nonWitnessUtxo
   * removed. The embedded previous transactions only serve USB hardware
   * wallets; the crypto-psbt flow signs from witnessUtxo alone, and dropping
   * them keeps the animated QR payload small. Strips a clone so the local
   * request PSBT keeps its full data for the combine/finalize step.
   */
  #toQrRequestBytes(psbt: bitcoin.Psbt): Buffer {
    const stripped = bitcoin.Psbt.fromBuffer(psbt.toBuffer());
    stripped.data.inputs.forEach(input => {
      delete input.nonWitnessUtxo;
    });
    return stripped.toBuffer();
  }

  /**
   * Merges the device's signatures into the original request PSBT and finalizes.
   * The stock SeedSigner returns a minimal signed PSBT (signatures only, no
   * witnessUtxo/script), so finalizing it directly fails with "No script found".
   * Combining into the request PSBT - which still carries each input's
   * witnessUtxo and key-origin - restores the script before finalizing.
   */
  #applySignedPsbt(
    signedCbor: Uint8Array,
    built: {
      network?: string;
      requestPsbt: bitcoin.Psbt;
    },
  ): BitcoinSignResult {
    const { network, requestPsbt } = built;
    const signedPsbtBytes = parseSignResponse(signedCbor);
    const signedPsbt = bitcoin.Psbt.fromBuffer(Buffer.from(signedPsbtBytes));

    if (signedPsbt.txInputs.length === 0) {
      throw new Error('Seed signer returned a PSBT with no inputs');
    }

    requestPsbt.combine(signedPsbt);
    requestPsbt.finalizeAllInputs();
    const hex = requestPsbt.extractTransaction().toHex();

    return {
      serializedTx: HexBytes.fromUTF8(JSON.stringify({ network, hex })),
    };
  }

  /** The device xfp as the 4-byte fingerprint bitcoinjs-lib expects. */
  #fingerprintBytes(): Buffer {
    return this.#masterFingerprint === undefined
      ? Buffer.alloc(4)
      : Buffer.from(this.#masterFingerprint, 'hex');
  }
}
