import { Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  dataVoid,
  dataVoidCbor,
  dustActionBurn,
  dustActionBurnCbor,
  dustActionCreate,
  dustActionCreateCbor,
} from '../../src/plutus/redeemer';

describe('DustAction redeemers', () => {
  it('Create is Constr 0 with zero fields', () => {
    const data = dustActionCreate();
    const constr = data.asConstrPlutusData()!;
    expect(constr.getAlternative()).toBe(0n);
    expect(constr.getData().getLength()).toBe(0);
  });

  it('Burn is Constr 1 with zero fields', () => {
    const data = dustActionBurn();
    const constr = data.asConstrPlutusData()!;
    expect(constr.getAlternative()).toBe(1n);
    expect(constr.getData().getLength()).toBe(0);
  });

  it('Data.void() is byte-identical to DustAction::Create', () => {
    expect(dataVoidCbor()).toBe(dustActionCreateCbor());
  });

  it('Create and Burn have distinct CBOR', () => {
    expect(dustActionCreateCbor()).not.toBe(dustActionBurnCbor());
  });

  it('roundtrips through CBOR', () => {
    const create = dustActionCreate();
    const burn = dustActionBurn();
    const voidD = dataVoid();
    expect(
      Serialization.PlutusData.fromCbor(create.toCbor()).equals(create),
    ).toBe(true);
    expect(Serialization.PlutusData.fromCbor(burn.toCbor()).equals(burn)).toBe(
      true,
    );
    expect(
      Serialization.PlutusData.fromCbor(voidD.toCbor()).equals(voidD),
    ).toBe(true);
  });

  it('produces stable CBOR (golden snapshots)', () => {
    expect(dustActionCreateCbor()).toMatchInlineSnapshot(`"d87980"`);
    expect(dustActionBurnCbor()).toMatchInlineSnapshot(`"d87a80"`);
    expect(dataVoidCbor()).toMatchInlineSnapshot(`"d87980"`);
  });
});
