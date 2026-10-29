/**
 * ADVERSARIAL coverage probe for the network-binding rule: does any
 * route from a dApp request to a produced signature skip it?
 *
 * Crypto is NOT mocked anywhere below: every signature is a real Ed25519
 * signature over real CBOR, so a produced witness here is a witness a mainnet
 * node would accept.
 */
import { Cardano, Serialization } from '@cardano-sdk/core';
import {
  Ed25519PublicKey,
  type Ed25519PublicKeyHex,
  Ed25519Signature,
  Hash28ByteBase16,
} from '@cardano-sdk/crypto';
import { AddressType, KeyRole } from '@cardano-sdk/key-management';
import {
  cip8SignData,
  createCardanoKeyAgentFromEncryptedRoot,
  resolveSignDataContext,
} from '@lace-contract/cardano-context';
import { deriveBip32PublicKey, hashEd25519PublicKey } from '@lace-lib/core';
import { ByteArray, HexBytes } from '@lace-lib/util';
import { beforeAll, describe, expect, it } from 'vitest';

import { isBoundToNetwork } from './support/network-binding-verdict';

import type { Bip32PublicKeyHex, Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { HexBlob } from '@cardano-sdk/util';

// ---------------------------------------------------------------------------
// Shared preview-testnet fixture (same one the regression tests use).
// ---------------------------------------------------------------------------
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

const fixtureBaseAddress =
  Cardano.Address.fromBech32(FIXTURE_ADDRESS).asBase()!;
const ownPaymentCredential = fixtureBaseAddress.getPaymentCredential();
const ownPaymentKeyHash =
  ownPaymentCredential.hash as unknown as Ed25519KeyHashHex;

const ownMainnetAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Mainnet,
  ownPaymentCredential,
  fixtureBaseAddress.getStakeCredential(),
)
  .toAddress()
  .toBech32() as Cardano.PaymentAddress;

const attackerMainnetAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Mainnet,
  {
    hash: Hash28ByteBase16('a'.repeat(56)),
    type: Cardano.CredentialType.KeyHash,
  },
  {
    hash: Hash28ByteBase16('b'.repeat(56)),
    type: Cardano.CredentialType.KeyHash,
  },
)
  .toAddress()
  .toBech32() as Cardano.PaymentAddress;

const attackerTestnetAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  {
    hash: Hash28ByteBase16('a'.repeat(56)),
    type: Cardano.CredentialType.KeyHash,
  },
  {
    hash: Hash28ByteBase16('b'.repeat(56)),
    type: Cardano.CredentialType.KeyHash,
  },
)
  .toAddress()
  .toBech32() as Cardano.PaymentAddress;

const mainnetDrainBody = {
  fee: 200_000n,
  inputs: [{ index: 0, txId: Cardano.TransactionId(`${'9'.repeat(63)}1`) }],
  networkId: Cardano.NetworkId.Mainnet,
  outputs: [
    { address: attackerMainnetAddress, value: { coins: 250_000_000n } },
  ],
  requiredExtraSignatures: [ownPaymentKeyHash],
} as unknown as Cardano.TxBody;

const mainnetDrainTxCbor = Serialization.Transaction.fromCore({
  body: mainnetDrainBody,
  id: Cardano.TransactionId(`${'0'.repeat(63)}1`),
  witness: { signatures: new Map() },
}).toCbor();

const mainnetDrainBodyHash = Serialization.Transaction.fromCbor(
  Serialization.TxCBOR(mainnetDrainTxCbor),
)
  .body()
  .hash();

const knownAddresses: GroupedAddress[] = [
  {
    accountIndex: 0,
    address: FIXTURE_ADDRESS,
    index: 0,
    networkId: Cardano.NetworkId.Testnet,
    rewardAccount: FIXTURE_REWARD_ACCOUNT,
    stakeKeyDerivationPath: { index: 0, role: KeyRole.Stake },
    type: AddressType.External,
  } as unknown as GroupedAddress,
];

// ===========================================================================
// ROUTE 2 -- CIP-30 signData / CIP-95 governance signing. Deliberately NOT
// covered by the rule. What does an attacker actually get?
// ===========================================================================
describe('ROUTE 2 -- signData (CIP-8/COSE) cannot yield a transaction witness', () => {
  let keyAgent: Awaited<
    ReturnType<typeof createCardanoKeyAgentFromEncryptedRoot>
  >;

  let dRepKeyHash: Ed25519KeyHashHex;

  beforeAll(async () => {
    keyAgent = await createCardanoKeyAgentFromEncryptedRoot({
      ...FIXTURE,
      authSecret: ByteArray.fromUTF8(PASSWORD) as unknown as Parameters<
        typeof createCardanoKeyAgentFromEncryptedRoot
      >[0]['authSecret'],
    });
    dRepKeyHash = hashEd25519PublicKey(
      await deriveBip32PublicKey(
        FIXTURE.extendedAccountPublicKey,
        KeyRole.DRep,
        0,
      ),
    );
  });

  /**
   * The strongest thing a dApp could ask for: sign the MAINNET transaction's
   * body hash as if it were a message. If the COSE path signed the raw
   * payload, the resulting 64 bytes would be a valid vkey witness for that
   * transaction and signData would be an unguarded signing oracle.
   */
  it('signs the Sig_structure, not the payload, so the mainnet body hash is never signed directly', async () => {
    const { signature } = await cip8SignData({
      dRepKeyHash,
      keyAgent,
      knownAddresses,
      request: {
        payload: String(mainnetDrainBodyHash),
        signWith: FIXTURE_ADDRESS,
      } as never,
    });

    // COSE_Sign1 = [ bstr protected, { "hashed": false }, bstr payload, bstr sig ]
    const reader = new Serialization.CborReader(
      signature as unknown as HexBlob,
    );
    reader.readStartArray();
    const protectedHeaders = reader.readByteString();
    reader.skipValue();
    const payload = reader.readByteString();
    const rawSignature = Buffer.from(reader.readByteString()).toString('hex');

    // The payload really is the mainnet body hash the attacker wanted signed.
    expect(Buffer.from(payload).toString('hex')).toBe(
      String(mainnetDrainBodyHash),
    );

    // Rebuild the Sig_structure the signature actually commits to.
    const writer = new Serialization.CborWriter();
    writer.writeStartArray(4);
    writer.writeTextString('Signature1');
    writer.writeByteString(protectedHeaders);
    writer.writeByteString(new Uint8Array(0));
    writer.writeByteString(payload);
    const sigStructure = Buffer.from(writer.encode()).toString('hex');

    const { publicKey: vkey } = await keyAgent.signBlob(
      { index: 0, role: AddressType.External },
      sigStructure as unknown as HexBlob,
    );
    const key = Ed25519PublicKey.fromHex(vkey as Ed25519PublicKeyHex);
    const ed25519Signature = Ed25519Signature.fromHex(rawSignature as never);

    // It verifies over the Sig_structure ...
    expect(key.verify(ed25519Signature, sigStructure as never)).toBe(true);
    // ... and NOT over the transaction body hash, which is what a vkey witness
    // must commit to. So no signData answer can move funds on any network.
    expect(key.verify(ed25519Signature, mainnetDrainBodyHash as never)).toBe(
      false,
    );
    expect(sigStructure.length / 2).toBeGreaterThan(32);
    // And the signing key really is the account's own payment key.
    expect(key.hash().hex()).toBe(ownPaymentKeyHash);
  });

  it('refuses a mainnet payment address outright: it is not in the account known set', () => {
    expect(() =>
      resolveSignDataContext({
        dRepKeyHash,
        knownAddresses,
        signWith: ownMainnetAddress,
      }),
    ).toThrow(/Unknown signWith address/);
  });

  /**
   * The one network-blind acceptance in the signData classifier: the DRep arm
   * matches on the key HASH alone, so a MAINNET-tagged enterprise address for
   * the account's DRep key is accepted while the wallet is on preview. It
   * gains an attacker nothing -- the protected headers carry the bare 28-byte
   * hash, so the bytes signed are identical either way -- but it is the one
   * place a foreign-network identifier is not rejected.
   */
  it('accepts a mainnet-tagged DRep enterprise address, and signs identical bytes for it', async () => {
    const drepOf = (networkId: Cardano.NetworkId) =>
      Cardano.EnterpriseAddress.fromCredentials(networkId, {
        hash: dRepKeyHash as unknown as Hash28ByteBase16,
        type: Cardano.CredentialType.KeyHash,
      })
        .toAddress()
        .toBech32() as Cardano.PaymentAddress;

    const mainnetDRep = drepOf(Cardano.NetworkId.Mainnet);
    const testnetDRep = drepOf(Cardano.NetworkId.Testnet);
    expect(mainnetDRep).not.toBe(testnetDRep);

    expect(
      resolveSignDataContext({
        dRepKeyHash,
        knownAddresses,
        signWith: mainnetDRep,
      }).isDRepSigning,
    ).toBe(true);

    const sign = async (signWith: Cardano.PaymentAddress) =>
      cip8SignData({
        dRepKeyHash,
        keyAgent,
        knownAddresses,
        request: { payload: 'deadbeef', signWith } as never,
      });
    const [fromMainnet, fromTestnet] = await Promise.all([
      sign(mainnetDRep),
      sign(testnetDRep),
    ]);
    expect(fromMainnet.signature).toBe(fromTestnet.signature);
  });
});

// ===========================================================================
// ROUTE 3 -- the rule's own completeness, probed adversarially.
// ===========================================================================
describe('ROUTE 3 -- isBoundToNetwork under adversarial shapes', () => {
  const PREVIEW_ID = Cardano.NetworkId.Testnet;

  const bodyWith = (extra: Partial<Cardano.TxBody>): Cardano.TxBody =>
    ({
      fee: 200_000n,
      inputs: [{ index: 0, txId: Cardano.TransactionId(`${'9'.repeat(63)}1`) }],
      outputs: [],
      ...extra,
    } as unknown as Cardano.TxBody);

  it('refuses the mainnet drain body', () => {
    expect(isBoundToNetwork(mainnetDrainBody, PREVIEW_ID)).toBe(false);
  });

  it('refuses a body whose ONLY network evidence is a mainnet BYRON output', () => {
    // A legacy mainnet address carries no network-magic attribute, which is
    // exactly how the SDK reports it as mainnet. Byron outputs are still
    // spendable on mainnet, so this had to be read, and it is.
    const byronMainnet =
      'Ae2tdPwUPEZFRbyhz3cpfC2CumGzNkFBN2L42rcUc2yjQpEkxDbkPodpMAi';
    const parsed = Cardano.Address.fromString(byronMainnet);
    expect(parsed?.getNetworkId()).toBe(Cardano.NetworkId.Mainnet);
    expect(
      isBoundToNetwork(
        bodyWith({
          outputs: [
            {
              address: byronMainnet as Cardano.PaymentAddress,
              value: { coins: 1n },
            },
          ],
        }),
        PREVIEW_ID,
      ),
    ).toBe(false);
  });

  it('refuses a mainnet body that hides its payoff behind a testnet DECOY output', () => {
    expect(
      isBoundToNetwork(
        bodyWith({
          networkId: Cardano.NetworkId.Mainnet,
          outputs: [
            {
              address: attackerTestnetAddress,
              value: { coins: 1n },
            },
            {
              address: attackerMainnetAddress,
              value: { coins: 250_000_000n },
            },
          ],
        }),
        PREVIEW_ID,
      ),
    ).toBe(false);
  });

  it('refuses a body that states nothing about its network', () => {
    expect(
      isBoundToNetwork(
        bodyWith({ requiredExtraSignatures: [ownPaymentKeyHash] }),
        PREVIEW_ID,
      ),
    ).toBe(false);
  });

  /**
   * The residual the rule does NOT close: it compares `networkId`, and every
   * Cardano testnet shares id 0. A preview-connected dApp can therefore obtain
   * a signature for a PREPROD transaction. No mainnet funds are reachable this
   * way -- both sides are testnets -- so this is a correctness gap, not a
   * funds gap.
   */
  it('KNOWN RESIDUAL: a preprod-targeted body passes while the wallet is on preview', () => {
    expect(
      isBoundToNetwork(
        bodyWith({
          networkId: Cardano.NetworkId.Testnet,
          outputs: [{ address: attackerTestnetAddress, value: { coins: 1n } }],
        }),
        PREVIEW_ID,
      ),
    ).toBe(true);
  });
});
