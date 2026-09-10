import * as bitcoin from 'bitcoinjs-lib';

import type { Network } from 'bitcoinjs-lib';

/**
 * Additional vbytes a signed P2WPKH input adds over its unsigned form, used
 * to approximate the final transaction size before any signature exists.
 */
const P2WPKH_WITNESS_VBYTES = 27;

const FEE_RATE_PRECISION = 10;

/**
 * A previous output an input spends: its locking script and value in satoshis.
 */
type SpentOutput = {
  script: Buffer;
  value: number;
};

/**
 * One PSBT input as shown on the sign review screen. Address and value are
 * undefined when the previous output the input spends could not be resolved.
 */
export type PsbtInspectionInput = {
  index: number;
  address?: string;
  value?: number;
  isOwn: boolean;
  willSign: boolean;
  sighashType?: number;
};

/**
 * One transaction output as shown on the sign review screen. Address is
 * undefined for scripts without an address form, such as OP_RETURN.
 */
export type PsbtInspectionOutput = {
  index: number;
  address?: string;
  value: number;
  isOwn: boolean;
};

/**
 * Security-relevant conditions the sign review screen must surface:
 * - nonDefaultSighash: a signed input uses, or its toSignInputs entry allows,
 *   a sighash other than SIGHASH_ALL, so the dApp can alter or replace parts
 *   of the transaction after signing. The connectors refuse such a request
 *   before the review opens, so this banner is defence in depth
 * - unresolvedInputValues: at least one input's previous output is unknown,
 *   so the fee and possibly the balance change cannot be verified
 * - signsForeignInputs: the wallet is asked to sign an input it does not own
 */
export type PsbtInspectionWarnings = {
  nonDefaultSighash: boolean;
  unresolvedInputValues: boolean;
  signsForeignInputs: boolean;
};

/**
 * What signing a dApp-supplied PSBT actually does, decoded into displayable
 * facts. Amounts are satoshis. fee and netBalanceChange are undefined when
 * the input values they depend on could not be resolved; they are never
 * computed from partial sums.
 */
export type PsbtInspection = {
  inputs: PsbtInspectionInput[];
  outputs: PsbtInspectionOutput[];
  fee?: number;
  estimatedFeeRate?: number;
  netBalanceChange?: number;
  unresolvedInputs: Array<{ index: number; txid: string; vout: number }>;
  warnings: PsbtInspectionWarnings;
};

/**
 * Wallet context used to classify the PSBT's inputs and outputs.
 * resolvedPrevOuts is keyed 'txid:vout', where txid is display-order
 * (big-endian) hex, the same orientation Transaction.getId() returns, and
 * supplies previous outputs fetched elsewhere for inputs whose PSBT carries
 * neither witnessUtxo nor nonWitnessUtxo.
 */
export type InspectPsbtParams = {
  ownAddresses: ReadonlySet<string>;
  network: Network;
  toSignInputs?: Array<{ index: number; sighashTypes?: number[] }>;
  resolvedPrevOuts?: ReadonlyMap<string, SpentOutput>;
};

/**
 * Indexes of the inputs the wallet would sign whose signature would not commit
 * to the whole transaction: either the PSBT input requests a sighash other
 * than SIGHASH_ALL, or its toSignInputs entry allows one. Everything a review
 * derives from the current outputs - fee, destination, balance change - can
 * still be rewritten after such a signature, so callers refuse the request
 * rather than merely warn about it.
 *
 * A sighashType of 0x00 is reported too, although bitcoinjs reads it as ALL and
 * taproot's SIGHASH_DEFAULT means exactly ALL. Unreachable while the wallet
 * derives native segwit only, since a p2tr input is never own and is refused as
 * foreign first; revisit if p2tr signing lands.
 *
 * @param inputs - Inputs as classified by inspectPsbt
 * @param toSignInputs - The dApp's input selection, whose sighashTypes list is
 * an allow-list the signature may pick from
 */
export const nonDefaultSighashInputs = (
  inputs: readonly Pick<
    PsbtInspectionInput,
    'index' | 'sighashType' | 'willSign'
  >[],
  toSignInputs?: readonly { index: number; sighashTypes?: number[] }[],
): number[] => {
  const allowedByIndex = new Map(
    toSignInputs?.map(entry => [entry.index, entry.sighashTypes]),
  );
  return inputs
    .filter(
      input =>
        input.willSign &&
        ((input.sighashType !== undefined &&
          input.sighashType !== bitcoin.Transaction.SIGHASH_ALL) ||
          allowedByIndex
            .get(input.index)
            ?.some(type => type !== bitcoin.Transaction.SIGHASH_ALL) === true),
    )
    .map(input => input.index);
};

const addressFromScript = (
  script: Buffer,
  network: Network,
): string | undefined => {
  try {
    return bitcoin.address.fromOutputScript(script, network);
  } catch {
    return undefined;
  }
};

const transactionFromBuffer = (
  buffer: Buffer,
): bitcoin.Transaction | undefined => {
  try {
    return bitcoin.Transaction.fromBuffer(buffer);
  } catch {
    return undefined;
  }
};

/**
 * Resolves the previous output an input spends, trusting the embedded
 * nonWitnessUtxo only when its txid matches the input's declared outpoint;
 * a mismatch means the value cannot be trusted, so the input stays
 * unresolved.
 */
const resolveSpentOutput = ({
  psbtInput,
  txid,
  vout,
  resolvedPrevOuts,
}: {
  psbtInput: { witnessUtxo?: SpentOutput; nonWitnessUtxo?: Buffer };
  txid: string;
  vout: number;
  resolvedPrevOuts?: ReadonlyMap<string, SpentOutput>;
}): SpentOutput | undefined => {
  if (psbtInput.witnessUtxo) {
    return psbtInput.witnessUtxo;
  }
  if (psbtInput.nonWitnessUtxo) {
    const spendingTx = transactionFromBuffer(psbtInput.nonWitnessUtxo);
    if (!spendingTx || spendingTx.getId() !== txid) {
      return undefined;
    }
    const output = spendingTx.outs[vout];
    return output ? { script: output.script, value: output.value } : undefined;
  }
  return resolvedPrevOuts?.get(`${txid}:${vout}`);
};

/**
 * Decodes an untrusted, dApp-supplied PSBT into the facts the sign review
 * screen displays: which inputs the wallet owns and will sign, where outputs
 * go, the fee, the net wallet balance change, and warnings for dangerous
 * requests.
 *
 * When toSignInputs is absent, the wallet defaults to signing its own inputs.
 * An unresolved input the wallet is asked to sign is treated as an own input
 * of unknown value, so it suppresses netBalanceChange; unresolved foreign
 * inputs do not.
 *
 * estimatedFeeRate is a display estimate only: it divides the fee by the
 * unsigned transaction's virtual size plus a flat P2WPKH witness allowance
 * per input, rounded to one decimal.
 *
 * @param psbtBase64 - Base64-encoded PSBT as supplied by the dApp
 * @param params - Wallet context used to classify inputs and outputs
 * @throws Error when psbtBase64 does not decode to a valid PSBT, when
 * toSignInputs references an input index that is out of range or repeated, or
 * when every input value is known and the outputs total more than the inputs
 */
export const inspectPsbt = (
  psbtBase64: string,
  params: InspectPsbtParams,
): PsbtInspection => {
  const { ownAddresses, network, toSignInputs, resolvedPrevOuts } = params;

  let psbt: bitcoin.Psbt;
  try {
    psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network });
  } catch (error) {
    throw new Error(
      `Failed to decode PSBT: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const toSignByIndex = new Map(
    toSignInputs?.map(entry => [entry.index, entry]),
  );
  for (const entry of toSignInputs ?? []) {
    if (
      !Number.isInteger(entry.index) ||
      entry.index < 0 ||
      entry.index >= psbt.txInputs.length
    ) {
      throw new Error(
        `Failed to decode PSBT: toSignInputs index ${entry.index} is out of range for ${psbt.txInputs.length} inputs`,
      );
    }
  }
  if (toSignInputs && toSignByIndex.size !== toSignInputs.length) {
    throw new Error(
      'Failed to decode PSBT: toSignInputs repeats an input index',
    );
  }

  const unresolvedInputs: PsbtInspection['unresolvedInputs'] = [];
  const inputs = psbt.txInputs.map((txInput, index): PsbtInspectionInput => {
    const psbtInput = psbt.data.inputs[index];
    const txid = Buffer.from(txInput.hash).reverse().toString('hex');
    const vout = txInput.index;

    const spentOutput = resolveSpentOutput({
      psbtInput,
      txid,
      vout,
      resolvedPrevOuts,
    });
    if (!spentOutput) {
      unresolvedInputs.push({ index, txid, vout });
    }

    const address = spentOutput
      ? addressFromScript(spentOutput.script, network)
      : undefined;
    const isOwn = address !== undefined && ownAddresses.has(address);
    const willSign = toSignInputs ? toSignByIndex.has(index) : isOwn;
    const sighashType =
      psbtInput.sighashType ?? toSignByIndex.get(index)?.sighashTypes?.[0];

    return {
      index,
      address,
      value: spentOutput?.value,
      isOwn,
      willSign,
      sighashType,
    };
  });

  const outputs = psbt.txOutputs.map(
    (txOutput, index): PsbtInspectionOutput => {
      const address = addressFromScript(txOutput.script, network);
      return {
        index,
        address,
        value: txOutput.value,
        isOwn: address !== undefined && ownAddresses.has(address),
      };
    },
  );

  const outputTotal = outputs.reduce(
    (total, output) => total + output.value,
    0,
  );
  const ownOutputTotal = outputs.reduce(
    (total, output) => total + (output.isOwn ? output.value : 0),
    0,
  );
  const resolvedInputs = inputs.filter(
    (input): input is PsbtInspectionInput & { value: number } =>
      input.value !== undefined,
  );
  const inputTotal = resolvedInputs.reduce(
    (total, input) => total + input.value,
    0,
  );
  const ownInputTotal = resolvedInputs.reduce(
    (total, input) => total + (input.isOwn ? input.value : 0),
    0,
  );

  const fee =
    unresolvedInputs.length > 0 ? undefined : inputTotal - outputTotal;
  if (fee !== undefined && fee < 0) {
    throw new Error(
      `Failed to decode PSBT: output total ${outputTotal} exceeds input total ${inputTotal}`,
    );
  }

  const hasUnresolvedSigningInput = inputs.some(
    input => input.willSign && input.value === undefined,
  );
  const netBalanceChange = hasUnresolvedSigningInput
    ? undefined
    : ownOutputTotal - ownInputTotal;

  const estimatedVsize =
    bitcoin.Transaction.fromBuffer(
      psbt.data.globalMap.unsignedTx.toBuffer(),
    ).virtualSize() +
    inputs.length * P2WPKH_WITNESS_VBYTES;
  const estimatedFeeRate =
    fee === undefined
      ? undefined
      : Math.round((fee / estimatedVsize) * FEE_RATE_PRECISION) /
        FEE_RATE_PRECISION;

  const willSignInputs = inputs.filter(input => input.willSign);
  const warnings: PsbtInspectionWarnings = {
    nonDefaultSighash: nonDefaultSighashInputs(inputs, toSignInputs).length > 0,
    unresolvedInputValues: unresolvedInputs.length > 0,
    signsForeignInputs: willSignInputs.some(
      input => input.value !== undefined && !input.isOwn,
    ),
  };

  return {
    inputs,
    outputs,
    fee,
    estimatedFeeRate,
    netBalanceChange,
    unresolvedInputs,
    warnings,
  };
};
