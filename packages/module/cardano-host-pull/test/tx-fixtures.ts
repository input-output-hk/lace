import { Serialization } from '@cardano-sdk/core';

import type { Cardano } from '@cardano-sdk/core';

// A mainnet tx cbor with a valid body — the structural base for test
// transactions. Its vkey witness set is replaced by `unsignedTx` below.
export const BASE_TX_CBOR =
  '84a60081825820260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f01018383581d70b429738bd6cc58b5c7932d001aa2bd05cfea47020a556c8c753d44361a004c4b40582007845f8f3841996e3d8157954e2f5e2fb90465f27112fc5fe9056d916fae245b82583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba1a0463676982583900b1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339ba821a00177a6ea2581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff198a5447742544319271044774554481a0031f9194577444f47451a0056898d4577555344431a000fc589467753484942411a000103c2581c659ab0b5658687c2e74cd10dba8244015b713bf503b90557769d77a7a14a57696e675269646572731a02269552021a0002e665031a01353f84081a013531740b58204107eada931c72a600a6e3305bd22c7aeb9ada7c3f6823b155f4db85de36a69aa20081825820e686ade5bc97372f271fd2abc06cfd96c24b3d9170f9459de1d8e3dd8fd385575840653324a9dddad004f05a8ac99fa2d1811af5f00543591407fb5206cfe9ac91bb1412404323fa517e0e189684cd3592e7f74862e3f16afbc262519abec958180c0481d8799fd8799fd8799fd8799f581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c68ffd8799fd8799fd8799f581c042f1946335c498d2e7556c5c647c4649c6a69d2b645cd1428a339baffffffff581cb1814238b0d287a8a46ce7348c6ad79ab8995b0e6d46010e2d9e1c681b000001863784a12ed8799fd8799f4040ffd8799f581c648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff1984577444f4745ffffffd8799fd87980190c8efffff5f6';

export const PK_ORIG = 'a1'.repeat(32);
export const SIG_ORIG = 'b1'.repeat(64);
export const PK_HOST = 'a2'.repeat(32);
export const SIG_HOST = 'b2'.repeat(64);
export const SIG_ORIG_STALE = 'cc'.repeat(64);

/** BASE_TX_CBOR rebuilt with the given vkey witness pairs (the "unsigned" tx). */
export const unsignedTx = (vkeys: Array<[string, string]>): string => {
  const tx = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(BASE_TX_CBOR),
  );
  const witnessSet = tx.witnessSet();
  witnessSet.setVkeys(
    Serialization.CborSet.fromCore(
      vkeys as Parameters<typeof Serialization.VkeyWitness.fromCore>[0][],
      Serialization.VkeyWitness.fromCore,
    ),
  );
  const rebuilt = new Serialization.Transaction(
    tx.body(),
    witnessSet,
    tx.auxiliaryData(),
  );
  return String(rebuilt.toCbor());
};

/** The host-returned `TransactionWitnessSet` cbor (the host's own vkeys). */
export const hostWitnessSetCbor = (vkeys: Array<[string, string]>): string =>
  String(
    Serialization.TransactionWitnessSet.fromCore({
      signatures: new Map(
        vkeys.map(([pk, sig]) => [pk, sig]),
      ) as Cardano.Signatures,
    }).toCbor(),
  );

/** Extract the vkey pubkey→signature map from a serialized tx. */
export const extractVkeys = (cbor: string): Map<string, string> => {
  const tx = Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor));
  const entries = tx.witnessSet().vkeys()?.toCore() ?? [];
  return new Map(entries.map(([pk, sig]) => [String(pk), String(sig)]));
};
