import { createSignerClient } from '@lace-lib/passkey';

import { requestRemoteCardanoAccountPublicKey } from './remote-cardano-account-public-key';
import { createRemoteCardanoVaultModule } from './remote-cardano-vault-module';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { CreateSignerClientProps, SignerClient } from '@lace-lib/passkey';

/** The options of `createRemotePasskeySigner`. */
export type CreateRemotePasskeySignerProps = {
  /** URL of the hosted Lace signer page; its origin is the only one trusted. */
  signerUrl: string;
  /**
   * Window that opens the popup and hears its handshake; defaults to
   * `window`.
   */
  host?: CreateSignerClientProps['host'];
};

/**
 * One connection to the hosted Lace self-custodial passkey wallet in the user's
 * browser, and the Cardano signing a dApp does through it.
 */
export type RemotePasskeySigner = Pick<
  SignerClient,
  'close' | 'connect' | 'open' | 'request'
> & {
  /** Signs Cardano transactions and data through the same signer connection. */
  cardanoVaultModule: ReturnType<typeof createRemoteCardanoVaultModule>;
  /**
   * Resolves the extended public key of the Cardano account at `accountIndex`
   * once the user agrees to share it in the signer window.
   */
  accountPublicKey: (accountIndex: number) => Promise<Bip32PublicKeyHex>;
};

/**
 * Creates one connection to the hosted Lace signer page and everything a dApp
 * signs Cardano transactions and data with through it: the connection's
 * `open`, `connect`, `close` and `request`, the `cardanoVaultModule` and
 * `accountPublicKey(index)`.
 *
 * It composes {@link createSignerClient} with the remote Cardano vault
 * module, so a dApp gets one connection to the Lace signer page instead of
 * building its own key source. The hosted signer is a self-custodial wallet:
 * wallet keys are derived and used in its window in the user's browser, and
 * the passkey stays in the user's authenticator. The dApp receives public
 * keys and signatures only.
 *
 * `open` must run synchronously inside the user's click handler: browsers
 * refuse a popup opened after an await. Call `connect` right after `open`
 * to complete the handshake; calling it before the popup is open rejects.
 *
 * Each Cardano signature is its own Approve click in the signer window and
 * its own fresh passkey assertion.
 *
 * @param props - The signer page's URL and the window that opens it.
 * @returns The signer. Call `open()` synchronously in a click handler, then
 *   `await connect()`.
 */
export const createRemotePasskeySigner = ({
  signerUrl,
  host,
}: CreateRemotePasskeySignerProps): RemotePasskeySigner => {
  const client = createSignerClient({ signerUrl, host });

  return {
    open: client.open,
    connect: client.connect,
    close: client.close,
    request: client.request,
    cardanoVaultModule: createRemoteCardanoVaultModule({ client }),
    accountPublicKey: async accountIndex =>
      requestRemoteCardanoAccountPublicKey(client, accountIndex),
  };
};
