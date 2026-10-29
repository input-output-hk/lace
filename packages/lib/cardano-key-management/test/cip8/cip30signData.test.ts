import { Cardano, Serialization, util } from '@lace-lib/cardano-core';
import * as Crypto from '@lace-lib/cardano-crypto';
import { HexBlob } from '@lace-lib/util/common';

import {
  AddressType,
  InMemoryKeyAgent,
  cip8,
  util as keyManagementUtil,
} from '../../src';
import { getAddressBytes } from '../../src/cip8';
import { createProtectedHeadersWithKeyIdCbor } from '../../src/cip8/cip30signData';
import { createSigStructureCbor } from '../../src/cip8/coseUtils';
import { DREP_KEY_DERIVATION_PATH } from '../../src/util';
import {
  mockKeyAgentDependencies,
  testAsyncKeyAgent,
  testKeyAgent,
} from '../mocks';

import type { AsyncKeyAgent, GroupedAddress, KeyAgent } from '../../src';
import type { Bip32Ed25519 } from '@lace-lib/cardano-crypto';

// COSE labels (RFC 8152)
const HEADER_ALG = 1n;
const HEADER_KID = 4n;
const KEY_X = -2n;
const ALGORITHM_EDDSA = -8n;

/** The four fields of a COSE_Sign1. */
const decodeCoseSign1 = (hex: string) => {
  const reader = new Serialization.CborReader(HexBlob(hex));
  reader.readStartArray();
  const protectedHeaders = reader.readByteString();
  reader.readStartMap();
  expect(reader.readTextString()).toBe('hashed');
  const hashed = reader.readBoolean();
  reader.readEndMap();
  const payload = reader.readByteString();
  const signature = reader.readByteString();
  reader.readEndArray();
  return { hashed, payload, protectedHeaders, signature };
};

/** The protected headers map, by label. */
const decodeProtectedHeaders = (bytes: Uint8Array) => {
  const reader = new Serialization.CborReader(HexBlob.fromBytes(bytes));
  const headers = new Map<bigint | string, Uint8Array | bigint>();
  const count = reader.readStartMap();
  for (let index = 0; index < (count ?? 0); index++) {
    const label =
      reader.peekState() === Serialization.CborReaderState.TextString
        ? reader.readTextString()
        : reader.readInt();
    const value =
      reader.peekState() === Serialization.CborReaderState.ByteString
        ? reader.readByteString()
        : reader.readInt();
    headers.set(label, value);
  }
  reader.readEndMap();
  return headers;
};

/** The public key of a COSE_Key, its `x` parameter. */
const decodeCoseKeyPublicKey = (hex: string) => {
  const reader = new Serialization.CborReader(HexBlob(hex));
  const count = reader.readStartMap();
  let publicKey: Uint8Array | undefined;
  for (let index = 0; index < (count ?? 0); index++) {
    const label = reader.readInt();
    if (label === KEY_X) publicKey = reader.readByteString();
    else if (reader.peekState() === Serialization.CborReaderState.ByteString)
      reader.readByteString();
    else reader.readInt();
  }
  reader.readEndMap();
  return publicKey!;
};

describe('cip30signData', () => {
  const payload = HexBlob('abc123');
  const addressDerivationPath = { index: 0, type: AddressType.External };
  let keyAgent: KeyAgent;
  let asyncKeyAgent: AsyncKeyAgent;
  let address: GroupedAddress;
  let drepKeyHex: Crypto.Ed25519PublicKeyHex;
  let drepKeyHash: Crypto.Ed25519KeyHashHex;
  let cryptoProvider: Bip32Ed25519;

  beforeAll(async () => {
    cryptoProvider = await Crypto.SodiumBip32Ed25519.create();
    const keyAgentReady = testKeyAgent();
    keyAgent = await keyAgentReady;
    asyncKeyAgent = await testAsyncKeyAgent(undefined, keyAgentReady);
    address = await asyncKeyAgent.deriveAddress(addressDerivationPath, 0);
    drepKeyHex = await asyncKeyAgent.derivePublicKey(DREP_KEY_DERIVATION_PATH);
    drepKeyHash = Crypto.Ed25519PublicKey.fromHex(drepKeyHex).hash().hex();
  });

  const signAndDecode = async (
    signWith: Cardano.PaymentAddress | Cardano.RewardAccount,
    knownAddresses: GroupedAddress[],
  ) => {
    const dataSignature = await cip8.cip30signData(keyAgent, {
      knownAddresses,
      payload,
      signWith,
    });
    const coseSign1 = decodeCoseSign1(dataSignature.signature);
    const publicKeyHex = util.bytesToHex(
      decodeCoseKeyPublicKey(dataSignature.key),
    );
    return { coseSign1, publicKeyHex };
  };

  const testAddressHeader = (
    protectedHeaders: Uint8Array,
    signWith: Cardano.PaymentAddress | Cardano.RewardAccount,
  ) => {
    const headers = decodeProtectedHeaders(protectedHeaders);
    const addressBytes = Cardano.Address.fromBech32(signWith).toBytes();
    expect(headers.get(HEADER_ALG)).toBe(ALGORITHM_EDDSA);
    expect(util.bytesToHex(headers.get(HEADER_KID) as Uint8Array)).toBe(
      addressBytes,
    );
    expect(util.bytesToHex(headers.get('address') as Uint8Array)).toBe(
      addressBytes,
    );
  };

  it('supports sign with payment address', async () => {
    const signWith = address.address;
    const { coseSign1, publicKeyHex } = await signAndDecode(signWith, [
      address,
    ]);
    testAddressHeader(coseSign1.protectedHeaders, signWith);
    expect(coseSign1.hashed).toBe(false);
    expect(util.bytesToHex(coseSign1.payload)).toBe(payload);
    expect(publicKeyHex).toEqual(
      await keyAgent.derivePublicKey({
        index: 0,
        role: addressDerivationPath.type as number,
      }),
    );
  });

  it('supports signing with reward account', async () => {
    const signWith = address.rewardAccount;
    const { coseSign1, publicKeyHex } = await signAndDecode(signWith, [
      address,
    ]);
    testAddressHeader(coseSign1.protectedHeaders, signWith);
    expect(publicKeyHex).toEqual(
      await keyAgent.derivePublicKey(address.stakeKeyDerivationPath!),
    );
  });

  it('supports signing with drep key hash as bech32 enterprise payment address', async () => {
    const drepAddress = Cardano.EnterpriseAddress.fromCredentials(
      Cardano.NetworkId.Testnet,
      { hash: drepKeyHash, type: Cardano.CredentialType.KeyHash },
    )
      .toAddress()
      .toBech32() as Cardano.PaymentAddress;
    const { coseSign1, publicKeyHex } = await signAndDecode(drepAddress, [
      address,
    ]);
    testAddressHeader(coseSign1.protectedHeaders, drepAddress);
    expect(publicKeyHex).toEqual(drepKeyHex);
  });

  it('signature can be verified', async () => {
    const signWith = address.address;
    const { coseSign1, publicKeyHex } = await signAndDecode(signWith, [
      address,
    ]);
    const sigStructure = HexBlob.fromBytes(
      createSigStructureCbor(coseSign1.protectedHeaders, coseSign1.payload),
    );
    expect(
      cryptoProvider.verify(
        util.bytesToHex(coseSign1.signature) as Crypto.Ed25519SignatureHex,
        sigStructure,
        publicKeyHex as Crypto.Ed25519PublicKeyHex,
      ),
    ).toBe(true);
  });

  it('refuses an address it holds no key for', async () => {
    const foreign = Cardano.PaymentAddress(
      'addr_test1qrtnkn24fr6dqzsegl5jsnxdehzkth2tskekazzn832wmxl69cvjxcm8f3647hh7s8rzpuvtmhuv7cl3s8gnvmllau6qpg2etl',
    );
    await expect(
      cip8.cip30signData(keyAgent, {
        knownAddresses: [address],
        payload,
        signWith: foreign,
      }),
    ).rejects.toMatchObject({
      code: cip8.Cip30DataSignErrorCode.ProofGeneration,
    });
  });

  let fixedKeyAgent: KeyAgent;
  let fixedAddress: GroupedAddress;
  const mnemonicWords = [...Array.from({ length: 23 }, () => 'abandon'), 'art'];
  const paymentAddress = Cardano.PaymentAddress(
    'addr_test1qqqt0pru382hy9vjlsxv3ye02z50sfvt8xunscg5pgden77z73dpdfng2ctw2ekqplqgrljelz7h4dneac27nn3qx3rqqpavzj',
  );
  const expectedProtectedHeaders =
    'a301270458390000b7847c89d5721592fc0cc8932f50a8f8258b39b93861140a1b99fbc2f45a16a6685616e566c00fc081fe59f8bd7ab679ee15e9ce203446676164647265737358390000b7847c89d5721592fc0cc8932f50a8f8258b39b93861140a1b99fbc2f45a16a6685616e566c00fc081fe59f8bd7ab679ee15e9ce203446';
  const expectedSignatures = {
    [paymentAddress]: {
      key: 'a501010258390000b7847c89d5721592fc0cc8932f50a8f8258b39b93861140a1b99fbc2f45a16a6685616e566c00fc081fe59f8bd7ab679ee15e9ce2034460327200621582063c5d69570349e4233a0575811464f0e8a3fd329abe76e9bdc3d3f1b95982179',
      signature:
        '845882a301270458390000b7847c89d5721592fc0cc8932f50a8f8258b39b93861140a1b99fbc2f45a16a6685616e566c00fc081fe59f8bd7ab679ee15e9ce203446676164647265737358390000b7847c89d5721592fc0cc8932f50a8f8258b39b93861140a1b99fbc2f45a16a6685616e566c00fc081fe59f8bd7ab679ee15e9ce203446a166686173686564f443abc12358401615f91480587d108505b6939ace586f7a1f0ae953f8750f6be87717e31684391f2ce07b2a36509367332606cd34155c59389548e1f4b97a2069e74a62c86509',
    },
    stake_test1urp0gksk5e59v9h9vmqqlsyplevl30t6keu7u90fecsrg3stmmepg: {
      key: 'a5010102581de0c2f45a16a6685616e566c00fc081fe59f8bd7ab679ee15e9ce20344603272006215820366598ec425ab8140830c4b5f91716d0f7b113fd7013ef3c90487e9dd1535437',
      signature:
        '84584aa3012704581de0c2f45a16a6685616e566c00fc081fe59f8bd7ab679ee15e9ce2034466761646472657373581de0c2f45a16a6685616e566c00fc081fe59f8bd7ab679ee15e9ce203446a166686173686564f443abc1235840ec70b111cfefa46f327f9d65ed6e83cfd8f2c331ed2c663dce79d338e93ee7a65870c53be383e4a6ceba73a8a9d91585b78afff70013f0915b45cbb46bdafb0c',
    },
    addr_test1vprud5mk40ttv4z5l4ltvcgfstmjzwyv73hczmmpue4dv0g0enxep: {
      key: 'a5010102581d6047c6d376abd6b65454fd7eb6610982f721388cf46f816f61e66ad63d03272006215820fcf7c17629fb2e5ce10954da0fe93ba1ce45ed902258ec50538282bd95985242',
      signature:
        '84584aa3012704581d6047c6d376abd6b65454fd7eb6610982f721388cf46f816f61e66ad63d6761646472657373581d6047c6d376abd6b65454fd7eb6610982f721388cf46f816f61e66ad63da166686173686564f443abc123584048216de39d7d690ad5e6acc270f860874cf12e5b07082ebea924621eb882a08cd497919c9ba6070f70a5c7f731d2f40df6a8e53a51b2e42374c6a289387e6606',
    },
  };

  describe('byte-exact output', () => {
    // Recorded for a fixed mnemonic from the WASM-based implementation this
    // one replaced: the protected headers' entry order, the negative-integer
    // encoding of the algorithm and the COSE_Key field order are all part of
    // the signature.
    beforeAll(async () => {
      fixedKeyAgent = await InMemoryKeyAgent.fromBip39MnemonicWords(
        {
          chainId: Cardano.ChainIds.Preview,
          getPassphrase: async () => Buffer.from('password'),
          mnemonicWords,
        },
        await mockKeyAgentDependencies(),
      );
      fixedAddress = await keyManagementUtil
        .createAsyncKeyAgent(fixedKeyAgent)
        .deriveAddress(addressDerivationPath, 0);
      expect(fixedAddress.address).toBe(paymentAddress);
    });

    it('writes the protected headers the WASM library wrote', () => {
      expect(
        HexBlob.fromBytes(
          createProtectedHeadersWithKeyIdCbor(getAddressBytes(paymentAddress)),
        ),
      ).toBe(expectedProtectedHeaders);
    });

    it.each(Object.entries(expectedSignatures))(
      'signs %s to the recorded bytes',
      async (signWith, expected) => {
        const dataSignature = await cip8.cip30signData(fixedKeyAgent, {
          knownAddresses: [fixedAddress],
          payload,
          signWith: signWith as Cardano.PaymentAddress | Cardano.RewardAccount,
        });
        expect(dataSignature).toEqual(expected);
      },
    );
  });

  it('KeyAgent.signCip8Data and the async key agent return the recorded bytes', async () => {
    const context = {
      knownAddresses: [fixedAddress],
      payload,
      signWith: paymentAddress,
    };
    const expected = expectedSignatures[paymentAddress];
    await expect(fixedKeyAgent.signCip8Data(context)).resolves.toEqual(
      expected,
    );
    await expect(
      keyManagementUtil
        .createAsyncKeyAgent(fixedKeyAgent)
        .signCip8Data(context),
    ).resolves.toEqual(expected);
  });

  describe('getAddressBytes', () => {
    it('can serializes an address to its raw format', async () => {
      const signWith = Cardano.PaymentAddress(
        'addr_test1qrtnkn24fr6dqzsegl5jsnxdehzkth2tskekazzn832wmxl69cvjxcm8f3647hh7s8rzpuvtmhuv7cl3s8gnvmllau6qpg2etl',
      );

      // Vector created with Cardano.Address.toBytes
      const expectedAddressBytes =
        '00d73b4d5548f4d00a1947e9284ccdcdc565dd4b85b36e88533c54ed9bfa2e192363674c755f5efe81c620f18bddf8cf63f181d1366fffef34';

      expect(HexBlob.fromBytes(getAddressBytes(signWith))).toBe(
        expectedAddressBytes,
      );
    });
  });
});
