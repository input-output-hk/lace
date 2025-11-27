// TODO: LW-11111 this is copied from SDK. We need to expose it from there instead
import { Serialization, Cardano } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

const mergeArrays = <T>(arr1: T[], arr2: T[], serializeFn: (item: T) => HexBlob): T[] => {
  // eslint-disable-next-line unicorn/no-array-callback-reference
  const serializedItems = new Set(arr1.map(serializeFn));
  const mergedArray = [...arr1];

  for (const item of arr2) {
    const serializedItem = serializeFn(item);
    if (!serializedItems.has(serializedItem)) {
      mergedArray.push(item);
      serializedItems.add(serializedItem);
    }
  }
  return mergedArray;
};

// eslint-disable-next-line complexity
export const mergeWitnesses = (lhs?: Cardano.Witness, rhs?: Cardano.Witness): Cardano.Witness => {
  if (!rhs) {
    if (!lhs) return { signatures: new Map() } as unknown as Cardano.Witness;
    return lhs as unknown as Cardano.Witness;
  }
  const mergedSignatures = new Map([...(lhs?.signatures ?? []), ...(rhs.signatures ?? [])]);

  // Merge arrays of complex objects
  const mergedRedeemers = mergeArrays(lhs?.redeemers || [], rhs.redeemers || [], (elem) =>
    Serialization.Redeemer.fromCore(elem).toCbor()
  );

  const mergedScripts = mergeArrays(lhs?.scripts || [], rhs.scripts || [], (elem) =>
    Serialization.Script.fromCore(elem).toCbor()
  );

  const mergedBootstrap = mergeArrays(lhs?.bootstrap || [], rhs.bootstrap || [], (elem) =>
    Serialization.BootstrapWitness.fromCore(elem).toCbor()
  );

  const mergedDatums = mergeArrays(lhs?.datums || [], rhs.datums || [], (elem) =>
    Serialization.PlutusData.fromCore(elem).toCbor()
  );

  return {
    bootstrap: mergedBootstrap,
    datums: mergedDatums,
    redeemers: mergedRedeemers,
    scripts: mergedScripts,
    signatures: mergedSignatures
  };
};
