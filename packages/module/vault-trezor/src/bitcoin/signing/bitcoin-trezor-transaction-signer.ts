import { HexBytes } from '@lace-lib/util';
import { defer } from 'rxjs';

import { toTrezorSignTransactionParams } from './psbt-to-trezor';

import type { PsbtToTrezorProps } from './psbt-to-trezor';
import type { TrezorBitcoinConnect } from '../../trezor-bitcoin-connect';
import type {
  BitcoinSignRequest,
  BitcoinSignResult,
  BitcoinTransactionSigner,
  BitcoinUnsignedTxDto,
} from '@lace-contract/bitcoin-context';
import type { Observable } from 'rxjs';

/**
 * Props addressing the Bitcoin Trezor account at the device seed. The master
 * fingerprint identifies the builder-stamped change output; the network
 * selects the firmware coin and the address encoding of spend outputs.
 */
export interface BitcoinTrezorTransactionSignerProps
  extends PsbtToTrezorProps {}

export interface BitcoinTrezorTransactionSignerDependencies {
  /** Resolves the platform's already-initialized Trezor Connect instance. */
  getConnect: () => Promise<TrezorBitcoinConnect>;
}

/**
 * Signs a Bitcoin transaction with a Trezor device. Trezor's signTransaction
 * API is input/output based rather than PSBT based, so the unsigned PSBT is
 * translated into Trezor's model and the device returns the fully signed raw
 * transaction (no PSBT finalization on our side). Construction is side-effect
 * free: the device is only contacted inside sign() on subscription.
 */
export class BitcoinTrezorTransactionSigner
  implements BitcoinTransactionSigner
{
  readonly #props: BitcoinTrezorTransactionSignerProps;
  readonly #dependencies: BitcoinTrezorTransactionSignerDependencies;

  public constructor(
    props: BitcoinTrezorTransactionSignerProps,
    dependencies: BitcoinTrezorTransactionSignerDependencies,
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
    const params = toTrezorSignTransactionParams(dto, this.#props);

    const connect = await this.#dependencies.getConnect();
    const response = await connect.signTransaction(params);
    if (!response.success) {
      throw new Error(
        `Trezor signTransaction failed: ${response.payload.error}`,
      );
    }

    return {
      serializedTx: HexBytes.fromUTF8(
        JSON.stringify({
          network: dto.network,
          hex: response.payload.serializedTx,
        }),
      ),
    };
  }
}
