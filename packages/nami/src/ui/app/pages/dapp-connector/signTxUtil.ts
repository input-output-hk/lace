import AssetFingerprint from '@emurgo/cip14-js';
import {
  bytesAddressToBinary,
  extractKeyOrScriptHash,
  getSpecificUtxo,
} from '../../../../api/extension';
import { valueToAssets } from '../../../../api/util';
import { Loader } from '../../../../api/loader';

const getPaymentKeyHash = async address => {
  try {
    return Buffer.from(
      Loader.Cardano.BaseAddress.from_address(
        Loader.Cardano.Address.from_bytes(address.to_bytes()),
      )
        .payment_cred()
        .to_keyhash()
        .to_bytes(),
    ).toString('hex');
  } catch (e) {}
  try {
    return Buffer.from(
      Loader.Cardano.EnterpriseAddress.from_address(
        Loader.Cardano.Address.from_bytes(address.to_bytes()),
      )
        .payment_cred()
        .to_keyhash()
        .to_bytes(),
    ).toString('hex');
  } catch (e) {}
  try {
    return Buffer.from(
      Loader.Cardano.PointerAddress.from_address(
        Loader.Cardano.Address.from_bytes(address.to_bytes()),
      )
        .payment_cred()
        .to_keyhash()
        .to_bytes(),
    ).toString('hex');
  } catch (e) {}
  throw Error('Not supported address type');
};

export const getKeyHashes = async (
  tx,
  utxos,
  account,
): Promise<{ key: string[]; kind: string[] } | { error: string }> => {
  let requiredKeyHashes: string[] = [];
  const baseAddr = Loader.Cardano.BaseAddress.from_address(
    Loader.Cardano.Address.from_bech32(account.paymentAddr),
  );
  const paymentKeyHash = Buffer.from(
    baseAddr.payment_cred().to_keyhash().to_bytes(),
  ).toString('hex');
  const stakeKeyHash = Buffer.from(
    baseAddr.stake_cred().to_keyhash().to_bytes(),
  ).toString('hex');

  //get key hashes from inputs
  const inputs = tx.body().inputs();
  for (let i = 0; i < inputs.len(); i++) {
    const input = inputs.get(i);
    const txHash = Buffer.from(input.transaction_id().to_bytes()).toString(
      'hex',
    );
    const index = parseInt(input.index().to_str());
    if (
      utxos.some(
        utxo =>
          Buffer.from(utxo.input().transaction_id().to_bytes()).toString(
            'hex',
          ) === txHash && parseInt(utxo.input().index().to_str()) === index,
      )
    ) {
      requiredKeyHashes.push(paymentKeyHash);
    } else {
      requiredKeyHashes.push('<not_owned_key_hash>');
    }
  }

  //get key hashes from certificates
  const txBody = tx.body();
  const keyHashFromCert = txBody => {
    for (let i = 0; i < txBody.certs().len(); i++) {
      const cert = txBody.certs().get(i);
      if (cert.kind() === 0) {
        const credential = cert.as_stake_registration().stake_credential();
        if (credential.kind() === 0) {
          // stake registration doesn't required key hash
        }
      } else if (cert.kind() === 1) {
        const credential = cert.as_stake_deregistration().stake_credential();
        if (credential.kind() === 0) {
          const keyHash = Buffer.from(
            credential.to_keyhash().to_bytes(),
          ).toString('hex');
          requiredKeyHashes.push(keyHash);
        }
      } else if (cert.kind() === 2) {
        const credential = cert.as_stake_delegation().stake_credential();
        if (credential.kind() === 0) {
          const keyHash = Buffer.from(
            credential.to_keyhash().to_bytes(),
          ).toString('hex');
          requiredKeyHashes.push(keyHash);
        }
      } else if (cert.kind() === 3) {
        const owners = cert.as_pool_registration().pool_params().pool_owners();
        for (let i = 0; i < owners.len(); i++) {
          const keyHash = Buffer.from(owners.get(i).to_bytes()).toString('hex');
          requiredKeyHashes.push(keyHash);
        }
      } else if (cert.kind() === 4) {
        const operator = cert.as_pool_retirement().pool_keyhash().to_hex();
        requiredKeyHashes.push(operator);
      } else if (cert.kind() === 6) {
        const instant_reward = cert
          .as_move_instantaneous_rewards_cert()
          .move_instantaneous_reward()
          .as_to_stake_creds()
          .keys();
        for (let i = 0; i < instant_reward.len(); i++) {
          const credential = instant_reward.get(i);

          if (credential.kind() === 0) {
            const keyHash = Buffer.from(
              credential.to_keyhash().to_bytes(),
            ).toString('hex');
            requiredKeyHashes.push(keyHash);
          }
        }
      }
    }
  };
  if (txBody.certs()) keyHashFromCert(txBody);

  // key hashes from withdrawals
  const withdrawals = txBody.withdrawals();
  const keyHashFromWithdrawal = withdrawals => {
    const rewardAddresses = withdrawals.keys();
    for (let i = 0; i < rewardAddresses.len(); i++) {
      const credential = rewardAddresses.get(i).payment_cred();
      if (credential.kind() === 0) {
        requiredKeyHashes.push(credential.to_keyhash().to_hex());
      }
    }
  };
  if (withdrawals) keyHashFromWithdrawal(withdrawals);

  //get key hashes from scripts
  const scripts = tx.witness_set().native_scripts();
  const keyHashFromScript = scripts => {
    for (let i = 0; i < scripts.len(); i++) {
      const script = scripts.get(i);
      if (script.kind() === 0) {
        const keyHash = Buffer.from(
          script.as_script_pubkey().addr_keyhash().to_bytes(),
        ).toString('hex');
        requiredKeyHashes.push(keyHash);
      }
      if (script.kind() === 1) {
        return keyHashFromScript(script.as_script_all().native_scripts());
      }
      if (script.kind() === 2) {
        return keyHashFromScript(script.as_script_any().native_scripts());
      }
      if (script.kind() === 3) {
        return keyHashFromScript(script.as_script_n_of_k().native_scripts());
      }
    }
  };
  if (scripts) keyHashFromScript(scripts);

  //get keyHashes from required signers
  const requiredSigners = tx.body().required_signers();
  if (requiredSigners) {
    for (let i = 0; i < requiredSigners.len(); i++) {
      requiredKeyHashes.push(
        Buffer.from(requiredSigners.get(i).to_bytes()).toString('hex'),
      );
    }
  }

  //get keyHashes from collateral
  const collateral = txBody.collateral();
  if (collateral) {
    for (let i = 0; i < collateral.len(); i++) {
      const c = collateral.get(i);
      const utxo = await getSpecificUtxo(
        Buffer.from(c.transaction_id().to_bytes()).toString('hex'),
        c.index(),
      );
      if (utxo) {
        const address = Loader.Cardano.Address.from_bech32(utxo.address);
        requiredKeyHashes.push(await getPaymentKeyHash(address));
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

export const getValue = async (tx, utxos, account) => {
  let inputValue = Loader.Cardano.Value.new(
    Loader.Cardano.BigNum.from_str('0'),
  );
  const inputs = tx.body().inputs();
  for (let i = 0; i < inputs.len(); i++) {
    const input = inputs.get(i);
    const inputTxHash = Buffer.from(input.transaction_id().to_bytes()).toString(
      'hex',
    );
    const inputTxId = parseInt(input.index().to_str());
    const utxo = utxos.find(utxo => {
      const utxoTxHash = Buffer.from(
        utxo.input().transaction_id().to_bytes(),
      ).toString('hex');
      const utxoTxId = parseInt(utxo.input().index().to_str());
      return inputTxHash === utxoTxHash && inputTxId === utxoTxId;
    });
    if (utxo) {
      inputValue = inputValue.checked_add(utxo.output().amount());
    }
  }
  const outputs = tx.body().outputs();
  let ownOutputValue = Loader.Cardano.Value.new(
    Loader.Cardano.BigNum.from_str('0'),
  );
  const externalOutputs = {};
  if (!outputs) return;
  for (let i = 0; i < outputs.len(); i++) {
    const output = outputs.get(i);
    const address = output.address().to_bech32();
    const hashBech32 = await extractKeyOrScriptHash(
      Buffer.from(output.address().to_bytes()).toString('hex'),
    );
    // making sure funds at mangled addresses are also included
    if (hashBech32 === account.paymentKeyHashBech32) {
      //own
      ownOutputValue = ownOutputValue.checked_add(output.amount());
    } else {
      //external
      if (!externalOutputs[address]) {
        const value = Loader.Cardano.Value.new(output.amount().coin());
        if (output.amount().multiasset())
          value.set_multiasset(output.amount().multiasset());
        externalOutputs[address] = { value };
      } else
        externalOutputs[address].value = externalOutputs[
          address
        ].value.checked_add(output.amount());
      const prefix = bytesAddressToBinary(output.address().to_bytes()).slice(
        0,
        4,
      );
      // from cardano ledger specs; if any of these prefixes match then it means the payment credential is a script hash, so it's a contract address
      if (
        prefix == '0111' ||
        prefix == '0011' ||
        prefix == '0001' ||
        prefix == '0101'
      ) {
        externalOutputs[address].script = true;
      }
      const datum = output.datum();
      if (datum)
        externalOutputs[address].datumHash = Buffer.from(
          datum.kind() === 0
            ? datum.as_data_hash().to_bytes()
            : Loader.Cardano.hash_plutus_data(datum.as_data().get()).to_bytes(),
        ).toString('hex');
    }
  }

  inputValue = await valueToAssets(inputValue);
  ownOutputValue = await valueToAssets(ownOutputValue);

  const involvedAssets = [
    ...new Set([
      ...inputValue.map(asset => asset.unit),
      ...ownOutputValue.map(asset => asset.unit),
    ]),
  ];
  const ownOutputValueDifference = involvedAssets.map(unit => {
    const leftValue = inputValue.find(asset => asset.unit === unit);
    const rightValue = ownOutputValue.find(asset => asset.unit === unit);
    const difference =
      BigInt(leftValue ? leftValue.quantity : '') -
      BigInt(rightValue ? rightValue.quantity : '');
    if (unit === 'lovelace') {
      return { unit, quantity: difference };
    }
    const policy = unit.slice(0, 56);
    const name = unit.slice(56);
    const fingerprint = AssetFingerprint.fromParts(
      Buffer.from(policy, 'hex'),
      Buffer.from(name, 'hex'),
    ).fingerprint();
    return {
      unit,
      quantity: difference,
      fingerprint,
      name: (leftValue || rightValue).name,
      policy,
    };
  });

  const externalValue = {};
  for (const address of Object.keys(externalOutputs)) {
    externalValue[address] = {
      ...externalOutputs[address],
      value: await valueToAssets(externalOutputs[address].value),
    };
  }

  const ownValue = ownOutputValueDifference.filter(
    v => v.quantity != BigInt(0),
  );
  return { ownValue, externalValue };
};
