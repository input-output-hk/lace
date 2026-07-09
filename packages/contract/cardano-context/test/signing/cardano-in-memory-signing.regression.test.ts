import { AddressType } from '@cardano-sdk/key-management';
import { AuthSecret } from '@lace-contract/authentication-prompt';
import {
  accessAuthSecret,
  clearAuthSecret,
  propagateAuthSecret,
} from '@lace-contract/authentication-prompt/src/store/auth-secret-accessor';
import { HexBytes } from '@lace-sdk/util';
import { firstValueFrom, from, of, switchMap } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';

import { CardanoInMemoryDataSigner } from '../../src/signing/cardano-in-memory-data-signer';
import {
  createCardanoKeyAgentFromEncryptedRoot,
  deriveDRepKeyHash,
} from '../../src/signing/cardano-key-agent';

import type { WithCardanoKeyAgent$ } from '../../src/signing/cardano-in-memory-transaction-signer';
import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { SignerAuth } from '@lace-contract/signer';

// Real preview-testnet fixture (see LW-14969): the root key is encrypted under
// the UTF-8 bytes of PASSWORD, so the real AES-GCM decrypt only succeeds while
// the auth secret is still alive.
const PASSWORD = 'ComplexPassword2024!';
const FIXTURE = {
  accountIndex: 0,
  chainId: { networkId: 0, networkMagic: 1 } as Cardano.ChainId,
  extendedAccountPublicKey:
    'a79619cd18f11202741213ab003dd40bffb2a31e8ad1bc5aab6f02be3c8aa9218d515cb54181fb2f5fc3af329e80949c082fb52f7b07e359bd7835a6762148bf' as Bip32PublicKeyHex,
  encryptedRootPrivateKey: HexBytes(
    '1a671129801c208c3c5ffa99ae85cf36d5a323144a427f17bb3a1b50cc36099752ca8b045138bce43f0636f2bb45380e0912c85a0834c26f632011c39c7a71c3e8543490a8656c2ebdb40d375dca2eb9e4a652a637631890d4776d5ad7319abd1d0bd3c1836a8d914050f28c690441bdf00d2b15416e0692f057e9f2205401948235f7efa7598e7fc737fa52066299c7cfc96ebf80d78c777bafa586',
  ),
};
const FIXTURE_ADDRESS =
  'addr_test1qpw0djgj0x59ngrjvqthn7enhvruxnsavsw5th63la3mjel3tkc974sr23jmlzgq5zda4gtv8k9cy38756r9y3qgmkqqjz6aa7' as Cardano.PaymentAddress;
const FIXTURE_REWARD_ACCOUNT =
  'stake_test1urc4mvzl2cp4gedl3yq2px7659krmzuzgnl2dpjjgsydmqqxgamj7' as Cardano.RewardAccount;

const knownAddresses: GroupedAddress[] = [
  {
    type: AddressType.External,
    index: 0,
    networkId: 0 as Cardano.NetworkId,
    accountIndex: 0,
    address: FIXTURE_ADDRESS,
    rewardAccount: FIXTURE_REWARD_ACCOUNT,
    stakeKeyDerivationPath: { role: 2, index: 0 },
  },
];

// Reproduces the factory's key-agent provider verbatim: the agent is unlocked
// under the real (zeroing) accessAuthSecret window, and `use` (the signing
// operation) runs inside that window via switchMap, so the auth-secret clone is
// zeroed only after the lazy decrypt completes.
const withKeyAgent$: WithCardanoKeyAgent$ = use =>
  accessAuthSecret(authSecret =>
    from(
      createCardanoKeyAgentFromEncryptedRoot({ ...FIXTURE, authSecret }),
    ).pipe(switchMap(use)),
  );

describe('Cardano in-memory signing — real auth-secret zeroing (LW-14969)', () => {
  afterEach(() => {
    clearAuthSecret();
  });

  it('signs data while the auth secret is alive and survives clone zeroing', async () => {
    propagateAuthSecret(AuthSecret.fromUTF8(PASSWORD));
    const auth: SignerAuth = { authenticate: () => of(true), accessAuthSecret };
    const signer = new CardanoInMemoryDataSigner({
      withKeyAgent$,
      dRepKeyHash$: from(deriveDRepKeyHash(FIXTURE)),
      knownAddresses,
      auth,
    });

    const result = await firstValueFrom(
      signer.signData({ signWith: FIXTURE_ADDRESS, payload: 'deadbeef' }),
    );

    expect(result.signature).toBeDefined();
    expect(result.key).toBeDefined();
  });
});
