import {
  ProviderError,
  TxSubmissionError,
  TxSubmissionErrorCode,
} from '@cardano-sdk/core';

import { BlockfrostProvider } from '../blockfrost-provider';

import type { SubmitTxArgs, ValueNotConservedData } from '@cardano-sdk/core';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';

type BlockfrostTxSubmissionErrorMessage = {
  contents: {
    contents: {
      contents: {
        error: [string];
      };
    };
  };
};

const tryParseBlockfrostTxSubmissionErrorMessage = (
  errorMessage: string,
): BlockfrostTxSubmissionErrorMessage | null => {
  try {
    const error = JSON.parse(errorMessage) as {
      contents?: { contents?: { contents?: { error?: string[] } } };
    };
    if (
      typeof error === 'object' &&
      error !== null &&
      'contents' in error &&
      typeof error.contents === 'object' &&
      error.contents !== null &&
      'contents' in error.contents &&
      typeof error.contents.contents === 'object' &&
      error.contents.contents !== null &&
      'contents' in error.contents.contents &&
      typeof error.contents.contents.contents === 'object' &&
      error.contents.contents.contents !== null &&
      'error' in error.contents.contents.contents &&
      Array.isArray(error.contents.contents.contents.error)
    ) {
      return error as unknown as BlockfrostTxSubmissionErrorMessage;
    }
  } catch {
    return null;
  }
  return null;
};

/**
 * @returns TxSubmissionError if sucessfully mapped, otherwise `null`
 */
const tryMapTxBlockfrostSubmissionError = (
  error: ProviderError,
): TxSubmissionError | null => {
  try {
    const detail = JSON.parse(error.detail as string) as { message?: string };
    if (typeof detail.message === 'string') {
      const blockfrostTxSubmissionErrorMessage =
        tryParseBlockfrostTxSubmissionErrorMessage(detail.message);
      if (!blockfrostTxSubmissionErrorMessage) {
        return null;
      }
      const message =
        blockfrostTxSubmissionErrorMessage.contents.contents.contents.error[0];
      if (message.includes('OutsideValidityIntervalUTxO')) {
        // error also contains information about validity interval and actual slots,
        // but we're currently not using this info
        return new TxSubmissionError(
          TxSubmissionErrorCode.OutsideOfValidityInterval,
          null,
          message,
        );
      }

      const valueNotConservedMatch =
        /ValueNotConservedUTxO.+Coin (\d+).+Coin (\d+)/.exec(message);
      if (valueNotConservedMatch) {
        const consumed = BigInt(valueNotConservedMatch[1]);
        const produced = BigInt(valueNotConservedMatch[2]);
        const valueNotConservedData: ValueNotConservedData = {
          // error also contains information about consumed and produced native assets
          // but we're currently not using this info
          consumed: { coins: consumed },
          produced: { coins: produced },
        };
        return new TxSubmissionError(
          TxSubmissionErrorCode.ValueNotConserved,
          valueNotConservedData,
          message,
        );
      }
    }
  } catch {
    return null;
  }

  return null;
};

export class BlockfrostTxSubmitProvider extends BlockfrostProvider {
  public constructor(client: HttpClient, logger: Logger) {
    super(client, logger);
  }

  public async submitTx({ signedTransaction }: SubmitTxArgs): Promise<string> {
    try {
      return await this.request<string>('tx/submit', {
        body: Buffer.from(signedTransaction as string, 'hex'),
        headers: { 'Content-Type': 'application/cbor' },
        method: 'POST',
      });
    } catch (error) {
      if (error instanceof ProviderError) {
        const submissionError = tryMapTxBlockfrostSubmissionError(error);
        if (submissionError) {
          throw new ProviderError(error.reason, submissionError, error.detail);
        }
      }
      throw error;
    }
  }
}
