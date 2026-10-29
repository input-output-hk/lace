import { ComposableError } from '@lace-lib/util/common';

const formatMessage = (detail?: string) => {
  const messageDetail = detail ? `: ${detail}` : '';
  return `Authentication failure${messageDetail}`;
};

export class AuthenticationError<
  InnerError = unknown,
> extends ComposableError<InnerError> {
  constructor(detail?: string, innerError?: InnerError) {
    super(formatMessage(detail), innerError);
  }
}
