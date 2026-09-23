import { HexBytes } from '@lace-lib/util';

import type { SendFlowSliceState } from '@lace-contract/send-flow';

/**
 * Returns the pretty-printed payload the transaction will be signed from, or
 * null when there is no decodable build for the form currently on screen.
 *
 * Two layers gate the output. The fees check handles staleness: fees are
 * cleared by every form change and failed build and set only by a successful
 * build, so serializedTx cannot describe an outdated selection while fees
 * are present. The JSON.parse try/catch handles content: after a submit
 * attempt, confirmationCompleted overwrites serializedTx with the signer's
 * proven BINARY (not the {transfers} JSON), and a Failure -> Form retry
 * keeps both that binary and the fees — so a settled Form state can hold an
 * undecodable value, and only the failed decode hides the section. Until a
 * rebuild replaces the binary, the disclosure therefore stays hidden on the
 * retry form.
 *
 * Token types are shown exactly as serialized — unshielded types keep their
 * `unshielded-<networkId>` prefix rather than the on-chain identifier the
 * signer derives from them — because the disclosure's contract is to show
 * the verbatim signer input.
 */
export const getSettledTransactionData = (
  sendFlowState: SendFlowSliceState,
): string | null => {
  const isSettledBuild =
    sendFlowState.status === 'Form' &&
    'fees' in sendFlowState &&
    sendFlowState.fees.length > 0;
  const serializedTx =
    isSettledBuild && 'serializedTx' in sendFlowState
      ? sendFlowState.serializedTx
      : '';

  if (!serializedTx) return null;

  try {
    return JSON.stringify(
      JSON.parse(HexBytes.toUTF8(HexBytes(serializedTx))),
      undefined,
      2,
    );
  } catch {
    // Not a decodable payload (e.g. a flow that serializes differently):
    // hide the section rather than show garbage.
    return null;
  }
};
