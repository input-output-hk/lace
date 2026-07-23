import * as ecc from '@bitcoinerlab/secp256k1';
import {
  bitcoinAccountDerivationPath,
  bitcoinFullDerivationPath,
} from '@lace-contract/bitcoin-context';
import { HexBytes } from '@lace-lib/util';
import * as bitcoin from 'bitcoinjs-lib';
import { defer } from 'rxjs';

import { resolveLedgerDeviceDescriptor } from '../../signing/resolve-device-descriptor';

import type {
  LedgerBitcoinInputSignature,
  LedgerBitcoinTransport,
} from '../../ledger-bitcoin-transport';
import type {
  BitcoinNetwork,
  BitcoinSignRequest,
  BitcoinSignResult,
  BitcoinTransactionSigner,
  BitcoinUnsignedTxDto,
} from '@lace-contract/bitcoin-context';
import type { WalletId } from '@lace-contract/wallet-repo';
import type { DeviceDescriptor } from '@lace-lib/util-hw';
import type { Observable } from 'rxjs';

/**
 * Props addressing a Bitcoin Ledger account at the device seed. The master
 * fingerprint, account path and xpub form the key origin of the default
 * native-segwit wallet policy the device signs against.
 */
export interface BitcoinLedgerTransactionSignerProps {
  masterFingerprint: string;
  accountIndex: number;
  extendedPublicKey: string;
  network: BitcoinNetwork;
  walletId: WalletId;
}

export interface BitcoinLedgerTransactionSignerDependencies {
  transport: LedgerBitcoinTransport;
  resolveLegacyDevice?: () => Promise<DeviceDescriptor>;
}

/**
 * Signs a Bitcoin transaction with a Ledger device via the ledger-bitcoin
 * AppClient. Stamps each owned input with a BIP-32 key-origin (the device
 * xfp + the full native-segwit path m/84'/coin'/account'/chain/index) so the
 * device recognizes its inputs, has the device sign the PSBT against the
 * default wpkh(@0/**) wallet policy, merges the returned signatures into the
 * request PSBT - which still carries each input's witnessUtxo - then
 * finalizes and extracts the signed transaction. Construction is side-effect
 * free: the device is only contacted inside sign() on subscription.
 */
export class BitcoinLedgerTransactionSigner
  implements BitcoinTransactionSigner
{
  readonly #props: BitcoinLedgerTransactionSignerProps;
  readonly #dependencies: BitcoinLedgerTransactionSignerDependencies;

  public constructor(
    props: BitcoinLedgerTransactionSignerProps,
    dependencies: BitcoinLedgerTransactionSignerDependencies,
  ) {
    this.#props = props;
    this.#dependencies = dependencies;
  }

  public sign(request: BitcoinSignRequest): Observable<BitcoinSignResult> {
    return defer(async () => this.#signTransaction(request.serializedTx));
  }

  async #signTransaction(serializedTx: HexBytes): Promise<BitcoinSignResult> {
    const dto = JSON.parse(
      HexBytes.toUTF8(serializedTx),
    ) as BitcoinUnsignedTxDto;
    const psbt = this.#stampKeyOrigins(dto);

    const descriptor = await resolveLedgerDeviceDescriptor(
      this.#props.walletId,
      this.#dependencies.resolveLegacyDevice,
    );
    const signatures = await this.#dependencies.transport.signPsbt(descriptor, {
      psbtBase64: psbt.toBase64(),
      masterFingerprint: this.#props.masterFingerprint,
      accountPath: bitcoinAccountDerivationPath({
        addressType: 'NativeSegWit',
        network: this.#props.network,
        account: this.#props.accountIndex,
      }),
      extendedPublicKey: this.#props.extendedPublicKey,
    });

    return this.#applySignatures(psbt, signatures, dto.network);
  }

  /**
   * Decodes the unsigned PSBT and stamps each input's BIP-32 key-origin with
   * the device xfp + full native-segwit path so the device matches its keys.
   */
  #stampKeyOrigins(dto: BitcoinUnsignedTxDto): bitcoin.Psbt {
    const psbt = bitcoin.Psbt.fromHex(dto.context);
    const fingerprint = Buffer.from(this.#props.masterFingerprint, 'hex');

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

    return psbt;
  }

  /**
   * Merges the device's per-input signatures into the request PSBT,
   * validates every signature against its own input's sighash, then
   * finalizes and extracts the signed transaction. The device yields bare
   * signatures rather than a PSBT, so the request PSBT - which still carries
   * each input's witnessUtxo and key-origin - provides the scripts finalize
   * needs. Validation happens before finalize: P2WPKH finalization only
   * checks the partialSig pubkey against the witness program, so corrupt
   * signature bytes or a signature paired to the wrong input would otherwise
   * finalize locally and only fail at broadcast.
   */
  #applySignatures(
    psbt: bitcoin.Psbt,
    signatures: LedgerBitcoinInputSignature[],
    network?: string,
  ): BitcoinSignResult {
    if (signatures.length === 0) {
      throw new Error('Ledger returned no signatures for the PSBT');
    }

    for (const { inputIndex, pubkey, signature } of signatures) {
      psbt.updateInput(inputIndex, {
        partialSig: [
          { pubkey: Buffer.from(pubkey), signature: Buffer.from(signature) },
        ],
      });
    }

    if (
      !psbt.validateSignaturesOfAllInputs((pubkey, messageHash, signature) =>
        ecc.verify(messageHash, pubkey, signature),
      )
    ) {
      throw new Error('Ledger returned an invalid signature for the PSBT');
    }

    psbt.finalizeAllInputs();
    const hex = psbt.extractTransaction().toHex();

    return {
      serializedTx: HexBytes.fromUTF8(JSON.stringify({ network, hex })),
    };
  }
}
