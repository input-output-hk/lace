import * as bitcoin from 'bitcoinjs-lib';

import type { Network } from 'bitcoinjs-lib';

const writeVariableInt = (value: number, target: number[]): void => {
  if (value < 0xfd) {
    target.push(value);
    return;
  }
  if (value <= 0xff_ff) {
    target.push(0xfd, value & 0xff, (value >> 8) & 0xff);
    return;
  }
  target.push(
    0xfe,
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
};

/**
 * Serializes a witness stack into the PSBT finalScriptWitness wire form:
 * item count followed by length-prefixed items, all varint encoded.
 */
const serializeWitnessStack = (witness: Buffer[]): Buffer => {
  const bytes: number[] = [];
  writeVariableInt(witness.length, bytes);
  for (const item of witness) {
    writeVariableInt(item.length, bytes);
    bytes.push(...item);
  }
  return Buffer.from(bytes);
};

/**
 * Rebuilds a finalized PSBT from the original unsigned PSBT and the fully
 * signed raw transaction extracted from it. The wallet's transaction signer
 * finalizes and extracts in one step, while dApps expect the finalized PSBT
 * back, so each input's final scriptSig and witness are copied from the raw
 * transaction onto the original PSBT.
 *
 * The two arguments must describe the same transaction. That holds for every
 * caller today, which extracts the raw transaction from the PSBT it passes, but
 * it is not checked by the type: a mismatched pair would otherwise produce a
 * PSBT that looks finalized while its signatures commit to different outputs.
 * Outputs, version and locktime are therefore compared up front.
 *
 * @param psbtBase64 - The original PSBT the signer consumed, base64-encoded
 * @param rawTxHex - The signed raw transaction extracted from that PSBT
 * @param network - Network the PSBT belongs to
 * @returns Base64-encoded finalized PSBT
 * @throws Error when the raw transaction is not the PSBT's transaction, signed:
 * a differing input set or order, output set, version or locktime, or an input
 * carrying no signature data
 */
export const finalizePsbtWithRawTransaction = (
  psbtBase64: string,
  rawTxHex: string,
  network: Network,
): string => {
  const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network });
  const transaction = bitcoin.Transaction.fromHex(rawTxHex);

  if (transaction.version !== psbt.version) {
    throw new Error(
      `Signed transaction has version ${transaction.version} but the PSBT has ${psbt.version}`,
    );
  }

  if (transaction.locktime !== psbt.locktime) {
    throw new Error(
      `Signed transaction has locktime ${transaction.locktime} but the PSBT has ${psbt.locktime}`,
    );
  }

  if (transaction.outs.length !== psbt.txOutputs.length) {
    throw new Error(
      `Signed transaction has ${transaction.outs.length} outputs but the PSBT has ${psbt.txOutputs.length}`,
    );
  }

  transaction.outs.forEach((output, index) => {
    const psbtOutput = psbt.txOutputs[index];
    if (
      output.value !== psbtOutput.value ||
      !output.script.equals(psbtOutput.script)
    ) {
      throw new Error(
        `Signed transaction output ${index} differs from the PSBT's`,
      );
    }
  });

  if (transaction.ins.length !== psbt.txInputs.length) {
    throw new Error(
      `Signed transaction has ${transaction.ins.length} inputs but the PSBT has ${psbt.txInputs.length}`,
    );
  }

  transaction.ins.forEach((input, index) => {
    const psbtInput = psbt.txInputs[index];
    if (!input.hash.equals(psbtInput.hash) || input.index !== psbtInput.index) {
      throw new Error(
        `Signed transaction input ${index} spends a different outpoint than the PSBT`,
      );
    }
    if (input.script.length === 0 && input.witness.length === 0) {
      throw new Error(
        `Signed transaction input ${index} carries no signature data`,
      );
    }
    psbt.updateInput(index, {
      ...(input.script.length > 0 && { finalScriptSig: input.script }),
      ...(input.witness.length > 0 && {
        finalScriptWitness: serializeWitnessStack(input.witness),
      }),
    });
  });

  return psbt.toBase64();
};
