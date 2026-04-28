import type { ErrorObject } from '@lace-lib/util-store';

interface ErrorLabels {
  codeTitle: string;
  timestampTitle: string;
  requestIdTitle: string;
}

interface ParsedErrorDetails {
  errorCode: string;
  errorMessage: string;
  timestamp: string;
  requestId: string;
}

export const parseErrorDetails = (
  submissionError: ErrorObject | undefined,
  defaultErrorMessage: string,
  labels: ErrorLabels,
): ParsedErrorDetails => {
  const errorCode = submissionError?.code || submissionError?.name || 'UNKNOWN';
  const errorMessage = submissionError?.message || defaultErrorMessage;
  const timestamp =
    typeof submissionError?.timestamp === 'string'
      ? submissionError.timestamp
      : new Date().toISOString().replace('T', ' ').split('.')[0] ?? '';
  const errorRecord = submissionError as Record<string, unknown> | undefined;
  const requestIdRaw = errorRecord?.requestId || errorRecord?.transactionId;
  const requestId = typeof requestIdRaw === 'string' ? requestIdRaw : 'N/A';

  return {
    errorCode: labels.codeTitle + String(errorCode),
    errorMessage: String(errorMessage),
    timestamp: labels.timestampTitle + String(timestamp),
    requestId: labels.requestIdTitle + String(requestId),
  };
};
