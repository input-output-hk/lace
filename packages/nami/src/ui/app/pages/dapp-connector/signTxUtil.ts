/* eslint-disable functional/prefer-immutable-types */
/* eslint-disable unicorn/no-null */
/* eslint-disable max-params */
import {
  coalesceValueQuantities,
  totalAddressInputsValueInspector,
  totalAddressOutputsValueInspector,
  Cardano,
} from '@cardano-sdk/core';
import groupBy from 'lodash/groupBy';

import type { Wallet } from '@lace/cardano';

const inputResolver = (
  utxos: Readonly<Wallet.Cardano.Utxo[]>,
): Cardano.InputResolver => ({
  resolveInput: async (input: Readonly<Cardano.TxIn>) =>
    // eslint-disable-next-line unicorn/no-useless-promise-resolve-reject
    Promise.resolve(
      utxos.find(
        utxo => utxo[0].txId === input.txId && utxo[0].index === input.index,
      )?.[1] ?? null,
    ),
});

export const getKeyHashes = (
  tx: Cardano.Tx,
  utxos: Wallet.Cardano.Utxo[],
  paymentAddr: Cardano.PaymentAddress,
): { error: string } | { key: string[]; kind: string[] } => {
  let requiredKeyHashes: string[] = [];
  const baseAddr = Cardano.Address.fromString(paymentAddr)?.asBase();

  if (!baseAddr) {
    return {
      error: `Invalid payment address: ${paymentAddr}`,
    };
  }

  const paymentKeyHash = baseAddr.getPaymentCredential().hash;
  const stakeKeyHash = baseAddr.getStakeCredential().hash;

  //get key hashes from inputs
  const inputs = tx.body.inputs;
  for (const input of inputs) {
    const txHash = input.txId;
    const index = input.index;
    if (
      utxos.some(utxo => utxo[0].txId === txHash && utxo[0].index === index)
    ) {
      requiredKeyHashes.push(paymentKeyHash);
    } else {
      requiredKeyHashes.push('<not_owned_key_hash>');
    }
  }

  //get key hashes from certificates
  const txBody = tx.body;
  const keyHashFromCert = (txBody: Cardano.TxBody) => {
    for (const cert of txBody.certificates ?? []) {
      switch (cert.__typename) {
        case Cardano.CertificateType.StakeRegistration: {
          // stake registration doesn't required key hash

          break;
        }
        case Cardano.CertificateType.StakeDeregistration: {
          const credential = cert.stakeCredential;
          if (credential.type === Cardano.CredentialType.KeyHash) {
            const keyHash = credential.hash;
            requiredKeyHashes.push(keyHash);
          }

          break;
        }
        case Cardano.CertificateType.StakeDelegation: {
          const credential = cert.stakeCredential;
          if (credential.type === Cardano.CredentialType.KeyHash) {
            const keyHash = credential.hash;
            requiredKeyHashes.push(keyHash);
          }

          break;
        }
        case Cardano.CertificateType.PoolRegistration: {
          const owners = cert.poolParameters.owners;
          for (const owner of owners) {
            const keyHash = Cardano.RewardAccount.toHash(owner);
            requiredKeyHashes.push(keyHash);
          }

          break;
        }
        case Cardano.CertificateType.PoolRetirement: {
          const operator = Cardano.PoolId.toKeyHash(cert.poolId);
          requiredKeyHashes.push(operator);

          break;
        }
        case Cardano.CertificateType.MIR: {
          if (cert.kind === Cardano.MirCertificateKind.ToStakeCreds) {
            const keyHash = cert.stakeCredential?.hash;
            if (keyHash) {
              requiredKeyHashes.push(keyHash);
            }
          }
          break;
        }
        default: {
          break;
        }
      }
    }
  };
  if (txBody.certificates) keyHashFromCert(txBody);

  // key hashes from withdrawals
  const withdrawals = txBody.withdrawals;
  const keyHashFromWithdrawal = (withdrawals: Cardano.Withdrawal[]) => {
    for (const withdrawal of withdrawals) {
      const credential = withdrawal.stakeAddress;
      requiredKeyHashes.push(Cardano.RewardAccount.toHash(credential));
    }
  };
  if (withdrawals) keyHashFromWithdrawal(withdrawals);

  //get key hashes from scripts
  const scripts = tx.witness.scripts?.filter(
    script => script.__type === Cardano.ScriptType.Native,
  );
  const keyHashFromScript = (scripts: Cardano.NativeScript[]) => {
    for (const script of scripts) {
      if (script.kind === Cardano.NativeScriptKind.RequireSignature) {
        const keyHash = script.keyHash;
        requiredKeyHashes.push(keyHash);
      }
      if (script.kind === Cardano.NativeScriptKind.RequireAllOf) {
        return keyHashFromScript(script.scripts);
      }
      if (script.kind === Cardano.NativeScriptKind.RequireAnyOf) {
        return keyHashFromScript(script.scripts);
      }
      if (script.kind === Cardano.NativeScriptKind.RequireNOf) {
        return keyHashFromScript(script.scripts);
      }
    }
  };
  if (scripts) keyHashFromScript(scripts);

  //get keyHashes from required signers
  const requiredSigners = tx.body.requiredExtraSignatures;
  if (requiredSigners) {
    for (const signer of requiredSigners) {
      requiredKeyHashes.push(signer);
    }
  }

  //get keyHashes from collateral
  if (txBody.collaterals) {
    for (const c of txBody.collaterals) {
      const utxo = utxos.find(
        utxo => utxo[0].txId === c.txId && utxo[0].index === c.index,
      );
      if (utxo) {
        const address = Cardano.Address.fromString(utxo[1].address);
        const paymentHash = address?.getProps().paymentPart?.hash;
        if (paymentHash) {
          requiredKeyHashes.push(paymentHash);
        }
      }
    }
  }

  const keyKind: string[] = [];
  requiredKeyHashes = [...new Set(requiredKeyHashes)];

  if (requiredKeyHashes.includes(paymentKeyHash)) keyKind.push('payment');
  if (requiredKeyHashes.includes(stakeKeyHash)) keyKind.push('stake');
  if (keyKind.length <= 0) {
    return {
      error: 'Signature not possible',
    };
  }
  return { key: requiredKeyHashes, kind: keyKind };
};

interface Asset {
  /** The unit of the asset ('lovelace' for ADA, or the asset ID for other tokens) */
  unit: Cardano.AssetId | 'lovelace';
  /** The quantity of the asset */
  quantity: bigint;
  /** The asset fingerprint (for non-ADA assets) */
  fingerprint?: Cardano.AssetFingerprint;
  /** The asset name (for non-ADA assets) */
  name?: Cardano.AssetName;
  /** The policy ID of the asset (for non-ADA assets) */
  policy?: Cardano.PolicyId;
}

interface ExternalOutput {
  value: Asset[];
  script?: boolean;
  datumHash?: string;
}

export interface TransactionValue {
  ownValue: Asset[];
  externalValue: Record<string, ExternalOutput>;
}

export const isScriptAddress = (address: Cardano.PaymentAddress) => {
  const addressObj = Cardano.Address.fromString(address);
  if (!addressObj) {
    console.error(
      `Failed to parse address: ${address} while calculating external outputs`,
    );
    return false;
  }

  if (addressObj) {
    switch (addressObj.getType()) {
      case Cardano.AddressType.BasePaymentScriptStakeKey:
      case Cardano.AddressType.BasePaymentKeyStakeScript:
      case Cardano.AddressType.BasePaymentScriptStakeScript:
      case Cardano.AddressType.PointerScript:
      case Cardano.AddressType.EnterpriseScript:
      case Cardano.AddressType.RewardScript: {
        return true;
      }
      default: {
        return false;
      }
    }
  }
};

/**
 * Converts a Cardano.Value object to an array of Asset objects.
 *
 * @param {Cardano.Value} value - The Cardano.Value object to convert.
 * @returns {Asset[]} An array of Asset objects representing the value.
 */
export const valueToAssetsSdk = (value: Cardano.Value): Asset[] => {
  const assets: Asset[] = [];
  assets.push({ unit: 'lovelace', quantity: value.coins });

  for (const [assetId, quantity] of value.assets || []) {
    const policy = Cardano.AssetId.getPolicyId(assetId);
    const name = Cardano.AssetId.getAssetName(assetId);
    const fingerprint = Cardano.AssetFingerprint.fromParts(policy, name);
    const asset: Asset = {
      quantity,
      unit: assetId,
      policy,
      name,
      fingerprint,
    };
    assets.push(asset);
  }

  return assets;
};

export const getValueWithSdk = async (
  tx: Readonly<Cardano.Tx>,
  utxos: Readonly<Wallet.Cardano.Utxo[]>,
  addresses: Cardano.PaymentAddress[],
): Promise<TransactionValue> => {
  const inputValue = valueToAssetsSdk(
    await totalAddressInputsValueInspector(addresses, inputResolver(utxos))(tx),
  );

  const ownOutputValue = valueToAssetsSdk(
    await totalAddressOutputsValueInspector(addresses)(tx),
  );

  const externalOutputsByAddress = Object.entries(
    groupBy(
      tx.body.outputs.filter(output =>
        addresses.every(addr => addr !== output.address),
      ),
      output => output.address,
    ),
  ) as [Cardano.PaymentAddress, Cardano.TxOut[]][];

  const externalOutputs: [
    Cardano.PaymentAddress,
    Omit<ExternalOutput, 'value'> & { value: Cardano.Value },
  ][] = externalOutputsByAddress.map(([address, outputs]) => {
    const datumHash = outputs.find(output => !!output.datumHash)?.datumHash;
    return [
      address,
      {
        value: coalesceValueQuantities(outputs.map(output => output.value)),
        script: isScriptAddress(address),
        ...(datumHash ? { datumHash } : {}),
      },
    ];
  });

  // Create a list of all asset IDs from inputs and own outputs. Includes the ADA ('lovelace') asset.
  const involvedAssets = [
    ...new Set([
      ...inputValue.map(asset => asset.unit),
      ...ownOutputValue.map(asset => asset.unit),
    ]),
  ];

  const ownOutputValueDifference = involvedAssets.map<Asset>(unit => {
    const leftValue = inputValue.find(asset => asset.unit === unit);
    const rightValue = ownOutputValue.find(asset => asset.unit === unit);
    const difference =
      BigInt(leftValue ? leftValue.quantity : '') -
      BigInt(rightValue ? rightValue.quantity : '');
    if (unit === 'lovelace') {
      return { unit, quantity: difference };
    }

    const policy = Cardano.AssetId.getPolicyId(unit);
    const name = Cardano.AssetId.getAssetName(unit);
    const fingerprint = Cardano.AssetFingerprint.fromParts(policy, name);

    return {
      unit,
      quantity: difference,
      fingerprint,
      name,
      policy,
    };
  });

  // Similar to externalOutputs, but with the value converted from Cardano.Value to Asset[]
  const externalValue: Record<Cardano.PaymentAddress, ExternalOutput> = {};
  for (const [address, valueAndDatumHash] of externalOutputs) {
    externalValue[address] = {
      ...valueAndDatumHash,
      value: valueToAssetsSdk(valueAndDatumHash.value),
    };
  }

  const ownValue = ownOutputValueDifference.filter(
    v => v.quantity != BigInt(0),
  );
  // Returns
  return { ownValue, externalValue };
};
