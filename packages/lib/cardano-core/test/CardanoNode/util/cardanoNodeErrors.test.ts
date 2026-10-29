import {
  CardanoNodeUtil,
  ChainSyncError,
  ChainSyncErrorCode,
  GeneralCardanoNodeError,
  GeneralCardanoNodeErrorCode,
  ProviderError,
  ProviderFailure,
  StateQueryError,
  StateQueryErrorCode,
  TxSubmissionError,
  TxSubmissionErrorCode,
} from '../../../src';

import type { OutsideOfValidityIntervalData } from '../../../src';
const unknownCardanoNodeError = (message: string) =>
  new GeneralCardanoNodeError(
    GeneralCardanoNodeErrorCode.Unknown,
    message,
    'Unknown Cardano node error, see "data"',
  );
const stateQueryError = new StateQueryError(
  StateQueryErrorCode.UnavailableInCurrentEra,
  null,
  'Query unavailable',
);
const generalError = new GeneralCardanoNodeError(
  GeneralCardanoNodeErrorCode.ConnectionFailure,
  null,
  'Refused',
);
const chainSyncError = new ChainSyncError(
  ChainSyncErrorCode.IntersectionNotFound,
  null,
  'Intersection not found',
);
const txSubmissionError = new TxSubmissionError(
  TxSubmissionErrorCode.OutsideOfValidityInterval,
  {
    currentSlot: 123,
    validityInterval: { invalidHereafter: 122 },
  } as OutsideOfValidityIntervalData,
  'Outside of validity interval',
);
const someOtherError = new Error('some other error');
const someString = 'some string';

describe('util/cardanoNodeErrors', () => {
  describe('casting utils', () => {
    it('returns error if value is instanceof expected type', () => {
      expect(CardanoNodeUtil.asCardanoNodeError(stateQueryError)).toBe(
        stateQueryError,
      );
      expect(CardanoNodeUtil.asStateQueryError(stateQueryError)).toBe(
        stateQueryError,
      );
    });
    it('returns null if value is not instanceof expected type', () => {
      expect(CardanoNodeUtil.asStateQueryError(someOtherError)).toBeNull();
      expect(CardanoNodeUtil.asStateQueryError(chainSyncError)).toBeNull();
      expect(CardanoNodeUtil.asStateQueryError(txSubmissionError)).toBeNull();
      expect(CardanoNodeUtil.asStateQueryError(generalError)).toBeNull();
    });
    it('is false if a non-error value is passed', () => {
      expect(CardanoNodeUtil.asStateQueryError(someString)).toBeNull();
    });
    it('wraps original error in GeneralCardanoError if it is not a known CardanoNodeError', () => {
      // The wrapper keeps the original error as its data.
      const asCode = ({
        code,
        message,
      }: {
        code: number;
        message: string;
      }) => ({
        code,
        message,
      });
      expect(
        asCode(CardanoNodeUtil.asCardanoNodeError(someOtherError)),
      ).toEqual(asCode(unknownCardanoNodeError(someOtherError.message)));
      expect(asCode(CardanoNodeUtil.asCardanoNodeError(someString))).toEqual(
        asCode(unknownCardanoNodeError(someString)),
      );
    });
  });

  describe('error code utils', () => {
    it('returns true if code is one of the options for the error type', () => {
      expect(
        CardanoNodeUtil.isChainSyncErrorCode(
          ChainSyncErrorCode.IntersectionInterleaved,
        ),
      ).toBe(true);
      expect(
        CardanoNodeUtil.isGeneralCardanoNodeErrorCode(
          GeneralCardanoNodeErrorCode.ConnectionFailure,
        ),
      ).toBe(true);
      expect(
        CardanoNodeUtil.isStateQueryErrorCode(StateQueryErrorCode.EraMismatch),
      ).toBe(true);
      expect(
        CardanoNodeUtil.isTxSubmissionErrorCode(
          TxSubmissionErrorCode.ExecutionUnitsTooLarge,
        ),
      ).toBe(true);
    });
    it('returns false if code is not one of the options for the error type', () => {
      expect(
        CardanoNodeUtil.isChainSyncErrorCode(
          GeneralCardanoNodeErrorCode.ConnectionFailure,
        ),
      ).toBe(false);
      expect(
        CardanoNodeUtil.isGeneralCardanoNodeErrorCode(
          StateQueryErrorCode.EraMismatch,
        ),
      ).toBe(false);
      expect(
        CardanoNodeUtil.isStateQueryErrorCode(
          TxSubmissionErrorCode.ExecutionUnitsTooLarge,
        ),
      ).toBe(false);
      expect(
        CardanoNodeUtil.isTxSubmissionErrorCode(
          StateQueryErrorCode.EraMismatch,
        ),
      ).toBe(false);
    });
  });

  describe('specific error type-guard utils', () => {
    it('returns true if error type and code matches', () => {
      expect(
        CardanoNodeUtil.isValueNotConservedError(
          new TxSubmissionError(
            TxSubmissionErrorCode.ValueNotConserved,
            null,
            '',
          ),
        ),
      ).toBe(true);
      expect(
        CardanoNodeUtil.isIncompleteWithdrawalsError(
          new TxSubmissionError(
            TxSubmissionErrorCode.IncompleteWithdrawals,
            null,
            '',
          ),
        ),
      ).toBe(true);
      expect(
        CardanoNodeUtil.isOutsideOfValidityIntervalError(
          new TxSubmissionError(
            TxSubmissionErrorCode.OutsideOfValidityInterval,
            null,
            '',
          ),
        ),
      ).toBe(true);
      expect(
        CardanoNodeUtil.isCredentialAlreadyRegistered(
          new TxSubmissionError(
            TxSubmissionErrorCode.CredentialAlreadyRegistered,
            null,
            '',
          ),
        ),
      ).toBe(true);
      expect(
        CardanoNodeUtil.isDrepAlreadyRegistered(
          new TxSubmissionError(
            TxSubmissionErrorCode.DRepAlreadyRegistered,
            null,
            '',
          ),
        ),
      ).toBe(true);
      expect(
        CardanoNodeUtil.isUnknownCredential(
          new TxSubmissionError(
            TxSubmissionErrorCode.UnknownCredential,
            null,
            '',
          ),
        ),
      ).toBe(true);
      expect(
        CardanoNodeUtil.isDrepNotRegistered(
          new TxSubmissionError(
            TxSubmissionErrorCode.DRepNotRegistered,
            null,
            '',
          ),
        ),
      ).toBe(true);
    });
    it('returns false if error type or code does not match', () => {
      expect(CardanoNodeUtil.isValueNotConservedError(generalError)).toBe(
        false,
      );
      expect(CardanoNodeUtil.isIncompleteWithdrawalsError(someOtherError)).toBe(
        false,
      );
      expect(CardanoNodeUtil.isOutsideOfValidityIntervalError(someString)).toBe(
        false,
      );
      expect(
        CardanoNodeUtil.isValueNotConservedError(
          new TxSubmissionError(
            TxSubmissionErrorCode.IncompleteWithdrawals,
            null,
            '',
          ),
        ),
      ).toBe(false);
      expect(
        CardanoNodeUtil.isIncompleteWithdrawalsError(
          new TxSubmissionError(
            TxSubmissionErrorCode.OutsideOfValidityInterval,
            null,
            '',
          ),
        ),
      ).toBe(false);
      expect(
        CardanoNodeUtil.isOutsideOfValidityIntervalError(
          new TxSubmissionError(
            TxSubmissionErrorCode.IncompleteWithdrawals,
            null,
            '',
          ),
        ),
      ).toBe(false);
      expect(
        CardanoNodeUtil.isCredentialAlreadyRegistered(
          new TxSubmissionError(
            TxSubmissionErrorCode.IncompleteWithdrawals,
            null,
            '',
          ),
        ),
      ).toBe(false);
      expect(
        CardanoNodeUtil.isDrepAlreadyRegistered(
          new TxSubmissionError(
            TxSubmissionErrorCode.IncompleteWithdrawals,
            null,
            '',
          ),
        ),
      ).toBe(false);
      expect(
        CardanoNodeUtil.isUnknownCredential(
          new TxSubmissionError(
            TxSubmissionErrorCode.IncompleteWithdrawals,
            null,
            '',
          ),
        ),
      ).toBe(false);
      expect(
        CardanoNodeUtil.isDrepNotRegistered(
          new TxSubmissionError(
            TxSubmissionErrorCode.IncompleteWithdrawals,
            null,
            '',
          ),
        ),
      ).toBe(false);
    });
  });

  describe('CardanoNodeUtil code narrowing', () => {
    it('asXErrorCode returns the code when it belongs to that family and null otherwise', () => {
      expect(
        CardanoNodeUtil.asTxSubmissionErrorCode(
          TxSubmissionErrorCode.ValueNotConserved,
        ),
      ).toBe(TxSubmissionErrorCode.ValueNotConserved);
      expect(
        CardanoNodeUtil.asTxSubmissionErrorCode(
          GeneralCardanoNodeErrorCode.Unknown,
        ),
      ).toBeNull();
      expect(
        CardanoNodeUtil.asStateQueryErrorCode(
          StateQueryErrorCode.UnavailableInCurrentEra,
        ),
      ).toBe(StateQueryErrorCode.UnavailableInCurrentEra);
      expect(CardanoNodeUtil.asStateQueryErrorCode('2001')).toBeNull();
      expect(
        CardanoNodeUtil.asChainSyncErrorCode(
          ChainSyncErrorCode.IntersectionNotFound,
        ),
      ).toBe(ChainSyncErrorCode.IntersectionNotFound);
      expect(CardanoNodeUtil.asChainSyncErrorCode(-1)).toBeNull();
      expect(
        CardanoNodeUtil.asGeneralCardanoNodeErrorCode(
          GeneralCardanoNodeErrorCode.ConnectionFailure,
        ),
      ).toBe(GeneralCardanoNodeErrorCode.ConnectionFailure);
      expect(
        CardanoNodeUtil.asGeneralCardanoNodeErrorCode(undefined),
      ).toBeNull();
    });

    it('isProviderError and isUnknownOutputReferences narrow by class and code', () => {
      const unknownOutputs = new TxSubmissionError(
        TxSubmissionErrorCode.UnknownOutputReferences,
        null,
        'unknown inputs',
      );
      expect(CardanoNodeUtil.isUnknownOutputReferences(unknownOutputs)).toBe(
        true,
      );
      expect(CardanoNodeUtil.isUnknownOutputReferences(stateQueryError)).toBe(
        false,
      );
      expect(
        CardanoNodeUtil.isProviderError(
          new ProviderError(ProviderFailure.NotFound),
        ),
      ).toBe(true);
      expect(CardanoNodeUtil.isProviderError(unknownOutputs)).toBe(false);
      expect(CardanoNodeUtil.isProviderError(new Error('plain'))).toBe(false);
    });
  });
});
