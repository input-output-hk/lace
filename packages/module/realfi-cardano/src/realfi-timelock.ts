/**
 * The RealFi cooldown timelock: `all [ RequireSignature(owner),
 * RequireTimeAfter(unlockSlot) ]` — must byte-match the partner SDK's
 * `buildTimelockNativeScript` so claims can rebuild the script and direct
 * unstakes can derive its address. Shared by the withdraw (claim) builder and
 * the direct-unstake destination.
 */
import { Cardano } from '@cardano-sdk/core';

/** Ed25519 key-hash brand, taken from the native-script union (no crypto dep). */
export type Ed25519KeyHashHex = Extract<
  Cardano.NativeScript,
  { kind: Cardano.NativeScriptKind.RequireSignature }
>['keyHash'];

/** The staker's payment key hash — the timelock's required signer. */
export const ownerKeyHash = (bech32: string): Ed25519KeyHashHex => {
  const hash = Cardano.Address.fromBech32(bech32)
    .asBase()
    ?.getPaymentCredential().hash;
  if (!hash) throw new Error(`Cannot derive payment key hash from ${bech32}`);
  return hash as unknown as Ed25519KeyHashHex;
};

export const timelockNativeScript = (
  owner: Ed25519KeyHashHex,
  unlockSlot: number,
): Cardano.NativeScript => ({
  __type: Cardano.ScriptType.Native,
  kind: Cardano.NativeScriptKind.RequireAllOf,
  scripts: [
    {
      __type: Cardano.ScriptType.Native,
      kind: Cardano.NativeScriptKind.RequireSignature,
      keyHash: owner,
    },
    {
      __type: Cardano.ScriptType.Native,
      kind: Cardano.NativeScriptKind.RequireTimeAfter,
      slot: Cardano.Slot(unlockSlot),
    },
  ],
});
