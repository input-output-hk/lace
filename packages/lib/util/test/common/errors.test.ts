import {
  ComposableError,
  InvalidArgumentError,
  InvalidStateError,
  formatErrorMessage,
  stripStackTrace,
} from '../../src/common';

class TestError<InnerError = unknown> extends ComposableError<InnerError> {
  constructor(innerError: InnerError) {
    super('Test error', innerError);
  }
}

const throwsError = () => {
  throw new Error('a');
};

const throwsComposableError = () => {
  try {
    throwsError();
  } catch (error) {
    throw new TestError(error);
  }
};

describe('stripStackTrace', () => {
  it('doesnt throw if given undefined', () => {
    const error = undefined;
    expect(() => stripStackTrace(error)).not.toThrow();
  });

  it('doesnt throw if given null', () => {
    const error = null;
    expect(() => stripStackTrace(error)).not.toThrow();
  });

  it('doesnt throw if a non Error object', () => {
    const error = { a: 'a' };
    expect(() => stripStackTrace(error)).not.toThrow();
    expect(() => stripStackTrace(10)).not.toThrow();
    expect(() => stripStackTrace('some error')).not.toThrow();
  });

  it('removes the stack field from the Error object', () => {
    try {
      throwsError();
    } catch (error) {
      stripStackTrace(error);
      expect((error as Error).stack).toBeUndefined();
    }
  });

  it('removes the stack field from the Error object and inner errors', () => {
    try {
      throwsComposableError();
    } catch (error) {
      let testError = error as TestError;
      let innerError = testError.innerError as Error;

      expect(testError.stack).toBeDefined();
      expect(innerError.stack).toBeDefined();

      stripStackTrace(error);

      testError = error as TestError;
      innerError = testError.innerError as Error;

      expect(testError.stack).toBeUndefined();
      expect(innerError.stack).toBeUndefined();
    }
  });
});

describe('error messages', () => {
  it('formatErrorMessage appends the detail in parentheses', () => {
    expect(formatErrorMessage('Failed')).toBe('Failed');
    expect(formatErrorMessage('Failed', 'timeout')).toBe('Failed (timeout)');
  });

  it('InvalidArgumentError and InvalidStateError name what went wrong', () => {
    expect(new InvalidArgumentError('amount', 'must be positive').message).toBe(
      "Invalid argument 'amount': must be positive",
    );
    expect(new InvalidStateError('not initialized').message).toContain(
      'not initialized',
    );
  });
});
