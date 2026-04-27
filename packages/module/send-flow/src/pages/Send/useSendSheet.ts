import { useAnalytics } from '@lace-contract/analytics';
import { useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import {
  useSendFlow,
  isSendFlowClosed,
  isSendFlowFormStep,
  isSendFlowSuccess,
} from '@lace-contract/send-flow';
import {
  FEATURE_FLAG_TOKEN_PRICING,
  TOKEN_PRICING_NETWORK_TYPE,
} from '@lace-contract/token-pricing';
import { TokenId, type Token } from '@lace-contract/tokens';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import {
  convertAmountToDenominated,
  parseLocaleNumber,
  rawToBigInt,
  bigIntToRaw,
  getLocaleSeparators,
  valueToLocale,
} from '@lace-lib/util-render';
import { BigNumber } from '@lace-sdk/util';
import debounce from 'lodash/fp/debounce';
import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import { useLaceSelector, useDispatchLaceAction } from '../../hooks';
import { useFeeToken } from '../../hooks/useFeeToken';
import { useSendFlowNavigation } from '../../hooks/useSendFlowNavigation';
import { computeFiatForFee } from '../../utils/computeFiatForFee';

import type { AccountId } from '@lace-contract/wallet-repo';
import type { SheetScreenProps } from '@lace-lib/navigation';
import type { AssetToSend, FeeEntry } from '@lace-lib/ui-toolkit';

const NOTE_SECTION_MAX_LENGTH = 64;

export const useSendSheet = (props: SheetScreenProps<SheetRoutes.Send>) => {
  const {
    assetsSelected,
    recipientAddress: initialRecipientAddress,
    accountId: initialAccountId,
  } = props.route.params;
  const pendingInitialAdditionalTokensRef = useRef<Token[] | null>(null);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const {
    selectedToken,
    note,
    setNote,
    assetInputValues,
    setAssetInputValues,
  } = useSendFlow();

  const { navigate } = useSendFlowNavigation();
  const { trackEvent } = useAnalytics();
  const trackEventRef = useRef(trackEvent);
  trackEventRef.current = trackEvent;

  // Redux state and actions for send-flow state machine
  const dispatchClosed = useDispatchLaceAction('sendFlow.closed', true);
  const sendFlowState = useLaceSelector('sendFlow.selectSendFlowState');
  const dispatchOpenRequested = useDispatchLaceAction('sendFlow.openRequested');
  const dispatchFormDataChanged = useDispatchLaceAction(
    'sendFlow.formDataChanged',
  );
  const dispatchConfirm = useDispatchLaceAction('sendFlow.confirmed', true);

  const accountsResult = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const walletsResult = useLaceSelector('wallets.selectAll');
  const tokensGroupedByAccount = useLaceSelector(
    'tokens.selectTokensGroupedByAccount',
  );

  // Use accountId from state machine if available (when flow is "open")
  const isFlowOpen =
    !isSendFlowClosed(sendFlowState) && !isSendFlowSuccess(sendFlowState);

  const selectedAccountId = useMemo(() => {
    return isFlowOpen ? sendFlowState.accountId : null;
  }, [isFlowOpen, sendFlowState]);

  // Read address from state machine (when flow is open)
  const addressFromStateMachine = isFlowOpen
    ? sendFlowState.form.address.value
    : '';

  // Read memo from state machine (when flow is open)
  const memoFromStateMachine = isFlowOpen
    ? (sendFlowState.form.blockchainSpecific?.value as { memo?: string })
        ?.memo ?? ''
    : '';

  // Read token transfers from state machine and transform to UI format
  const assetsFromStateMachine: AssetToSend[] = isFlowOpen
    ? sendFlowState.form.tokenTransfers.map(transfer => ({
        type: transfer.token.value.metadata?.isNft ? 'nft' : 'token',
        token: {
          tokenId: transfer.token.value.tokenId,
          name: transfer.token.value.metadata?.name,
          symbol: transfer.token.value.metadata?.ticker,
          decimals: transfer.token.value.decimals,
          available: convertAmountToDenominated(
            transfer.token.value.available?.toString() || '0',
            transfer.token.value.decimals || 0,
          ),
          displayShortName: transfer.token.value.displayShortName,
          metadata: transfer.token.value.metadata,
        },
        value: transfer.amount.value.toString(), // Convert bigint to string for UI
        amount: '',
        symbol: transfer.token.value.displayShortName || '',
        currency: '',
      }))
    : [];

  // Transform token transfers to raw input values (convert BigNumber to raw string)
  const assetInputValuesFromStateMachine = isFlowOpen
    ? sendFlowState.form.tokenTransfers.map(transfer => {
        // Convert BigNumber to bigint, then to raw string
        const bigintValue = BigNumber.valueOf(transfer.amount.value);
        return {
          tokenId: transfer.token.value.tokenId,
          value: bigIntToRaw(bigintValue, transfer.token.value.decimals || 0),
        };
      })
    : [];

  // Merge local input values with state machine values
  // Use local values (raw) for responsive UI, fall back to state machine when not available
  const mergedAssetInputValues = assetInputValuesFromStateMachine.map(
    stateMachineValue => {
      const localValue = assetInputValues.find(
        local => local.tokenId === stateMachineValue.tokenId,
      );
      if (localValue) {
        return localValue;
      }

      return {
        tokenId: stateMachineValue.tokenId,
        value: stateMachineValue.value || '0',
      };
    },
  );

  // Read amount errors from state machine
  const assetErrorsFromStateMachine = isFlowOpen
    ? sendFlowState.form.tokenTransfers.map(transfer => {
        const amountError = transfer.amount.error;
        if (!amountError) return '';
        if (amountError.error === 'insufficient-balance') {
          return t('v2.send-flow.form.errors.balance.insuficient');
        }
        if (amountError.error === 'less-than-minimum') {
          return t('v2.send-flow.form.errors.amount.less-than-minimum', {
            min: amountError.argument,
          });
        }
        return '';
      })
    : [];

  const recipientErrorMessage =
    isFlowOpen && sendFlowState.form.address.error
      ? t(sendFlowState.form.address.error)
      : '';

  // Read tx build error from state machine (e.g. insufficient dust)
  const txBuildError =
    isFlowOpen && sendFlowState.txBuildErrorTranslationKey
      ? t(sendFlowState.txBuildErrorTranslationKey)
      : undefined;

  // Group all tokens for the selected account
  const tokens = useMemo(() => {
    if (!selectedAccountId) return [];
    const { fungible = [], nfts = [] } =
      tokensGroupedByAccount[selectedAccountId] ?? {};
    return [...fungible, ...nfts];
  }, [tokensGroupedByAccount, selectedAccountId]);

  const accountIdForInitialSend = useMemo(
    () => initialAccountId ?? assetsSelected?.[0]?.accountId ?? null,
    [initialAccountId, assetsSelected],
  );

  const tokensForInitialSendAccount = useMemo(() => {
    if (!accountIdForInitialSend) return [];
    const { fungible = [], nfts = [] } =
      tokensGroupedByAccount[accountIdForInitialSend] ?? {};
    return [...fungible, ...nfts];
  }, [tokensGroupedByAccount, accountIdForInitialSend]);

  const lovelaceTokenForInitialSend = useMemo(
    () =>
      tokensForInitialSendAccount.find(
        token => token.tokenId === TokenId('lovelace'),
      ) ?? null,
    [tokensForInitialSendAccount],
  );

  const accounts = useMemo(
    () => (Array.isArray(accountsResult) ? accountsResult : []),
    [accountsResult],
  );

  const blockchainName = useMemo(() => {
    if (!selectedAccountId) return null;
    const account = accounts.find(
      accumulator => accumulator.accountId === selectedAccountId,
    );
    return account?.blockchainName ?? null;
  }, [accounts, selectedAccountId]);

  const [sendFlowSheetUICustomisation] = useUICustomisation(
    'addons.loadSendFlowSheetUICustomisations',
    { blockchainOfTheTransaction: blockchainName },
  );

  const feeToken = useFeeToken(blockchainName ?? 'Cardano');

  // Read fees from state machine and transform to UI format
  const networkType = useLaceSelector('network.selectNetworkType');
  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const allPrices = useLaceSelector('tokenPricing.selectPrices');
  const currencyPreference = useLaceSelector(
    'tokenPricing.selectCurrencyPreference',
  );
  const isTokenPricingEnabled = useMemo(
    () =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_TOKEN_PRICING) &&
      networkType === TOKEN_PRICING_NETWORK_TYPE,
    [featureFlags, networkType],
  );

  const shouldShowFiatConversion =
    !!sendFlowSheetUICustomisation?.showFiatConversion;

  // Read fees from state machine and transform to UI format (aligned with Midnight app: use fee fallback for correct decimals/ticker e.g. dust)
  const estimatedFee: FeeEntry[] = useMemo(() => {
    if (!isFlowOpen) return [];

    // Only StateOpen has fees property
    const fees = 'fees' in sendFlowState ? sendFlowState.fees : [];
    if (!fees.length) return [];

    const fiatParams =
      shouldShowFiatConversion && isTokenPricingEnabled
        ? { allPrices, currencyPreference }
        : { allPrices: undefined, currencyPreference: undefined };

    return fees.map(fee => {
      // Use fee token from UI customization (deterministic per blockchain)
      const token: FeeEntry['token'] = feeToken ?? {
        tokenId: fee.tokenId,
        displayShortName: fee.tokenId,
        decimals: 0,
      };

      const feeAmountString = fee.amount.toString();
      const fiat = computeFiatForFee({
        rawAmount: feeAmountString,
        chainName: blockchainName,
        ...fiatParams,
      });

      if (sendFlowSheetUICustomisation?.formatFeeEntryForDisplay) {
        const formatted = sendFlowSheetUICustomisation.formatFeeEntryForDisplay(
          {
            feeAmount: feeAmountString,
            token,
          },
        );
        return {
          ...formatted,
          currency: fiat.currency,
          value: fiat.value,
        };
      }

      const denominatedAmount = convertAmountToDenominated(
        feeAmountString,
        token.decimals,
      );
      return {
        amount: valueToLocale(denominatedAmount),
        token,
        value: fiat.value,
        currency: fiat.currency,
      };
    });
  }, [
    isFlowOpen,
    sendFlowState,
    feeToken,
    sendFlowSheetUICustomisation,
    shouldShowFiatConversion,
    isTokenPricingEnabled,
    allPrices,
    currencyPreference,
    blockchainName,
  ]);

  const [recipientAddress, setRecipientAddress] = useState('');

  const wallets = useMemo(
    () => (Array.isArray(walletsResult) ? walletsResult : []),
    [walletsResult],
  );

  const shouldShowNoteSection = !!sendFlowSheetUICustomisation?.showNoteSection;

  const nativeTokenId = useMemo(
    () =>
      sendFlowSheetUICustomisation?.nativeTokenInfo({ networkType })?.tokenId,
    [sendFlowSheetUICustomisation, networkType],
  );

  const transfers = useMemo(
    () =>
      isSendFlowFormStep(sendFlowState)
        ? sendFlowState.form.tokenTransfers
        : [],
    [sendFlowState],
  );

  // Native token and NFTs amount rows has no max button
  const shouldShowMaxButton = useCallback(
    (tokenId: string) => {
      if (!sendFlowSheetUICustomisation?.showMaxButton) return false;
      if (tokenId === nativeTokenId) return false;
      const transfer = transfers.find(tt => tt.token.value.tokenId === tokenId);
      return !transfer?.token.value.metadata?.isNft;
    },
    [sendFlowSheetUICustomisation, nativeTokenId, transfers],
  );

  // Native token amount row has no remove button
  const shouldShowRemoveAsset = useCallback(
    (index: number) => transfers[index]?.token.value.tokenId !== nativeTokenId,
    [transfers, nativeTokenId],
  );

  // Get the notice component from UI customization (if provided by blockchain module)
  const NoticeComponent = sendFlowSheetUICustomisation?.NoticeComponent;
  const FeeSection = sendFlowSheetUICustomisation?.FeeSection;

  const canSendMoreThanOneAsset =
    sendFlowSheetUICustomisation?.canSendMoreThanOneAsset ?? true;

  const accountData = useMemo(() => {
    if (!Array.isArray(accounts)) return [];

    return accounts.map(account => {
      const wallet = wallets.find(item => item?.walletId === account?.walletId);
      return {
        accountId: account.accountId,
        accountName: account?.metadata?.name ?? '',
        walletName: wallet?.metadata?.name ?? '',
        status: '',
        leftIcon: account?.blockchainName || 'Cardano',
      };
    });
  }, [accounts, wallets]);

  const maxAmountAssetIndex = useMemo(() => {
    return assetsFromStateMachine.findIndex(
      asset => asset.token.tokenId === selectedToken?.tokenId,
    );
  }, [assetsFromStateMachine, selectedToken]);

  // Debounced dispatch to Redux for amount changes
  const debouncedAmountDispatch = useMemo(
    () =>
      debounce(
        500,
        (tokenId: TokenId, localeValue: string, decimals: number) => {
          const rawValue = parseLocaleNumber(localeValue || '0');
          const bigintValue = rawToBigInt(rawValue || '0', decimals);
          const bigNumberValue = BigNumber(bigintValue);

          dispatchFormDataChanged({
            data: {
              fieldName: 'tokenTransfers.amount',
              id: tokenId,
              value: bigNumberValue,
            },
          });
        },
      ),
    [dispatchFormDataChanged],
  );

  const debouncedTrackAssetInputChange = useMemo(
    () =>
      debounce(500, (index: number) =>
        trackEventRef.current('send | asset input change', { index }),
      ),
    [],
  );

  const handleAddAsset = useCallback(() => {
    if (!selectedAccountId) return;
    trackEvent('send | add assets | press');
    navigate(SheetRoutes.AddAssets, {
      accountId: selectedAccountId,
      blockchainName: blockchainName ?? 'Cardano',
    });
  }, [selectedAccountId, blockchainName, navigate, trackEvent]);

  const handleMaxAmountPress = useCallback(
    (index: number) => {
      const asset = assetsFromStateMachine[index];
      if (!asset?.token?.available || !isFlowOpen) return;
      if (asset.type === 'nft' || asset.token.metadata?.isNft) return;
      trackEvent('send | max amount | press', { index });

      const transfer = sendFlowState.form.tokenTransfers[index];
      const tokenId = transfer?.token.value.tokenId;
      if (!tokenId) return;

      const availableRaw = asset.token.available;
      const decimals = transfer.token.value.decimals || 0;

      const availableLocaleFormatted = valueToLocale(availableRaw);

      const isNewToken = !assetInputValues.some(
        item => item.tokenId === tokenId,
      );
      if (isNewToken) {
        trackEvent('send | max amount | add', { index, tokenId });
      }

      setAssetInputValues(previous => {
        const updated = [...previous];
        const existingIndex = updated.findIndex(
          item => item.tokenId === tokenId,
        );

        if (existingIndex >= 0) {
          updated[existingIndex] = { tokenId, value: availableLocaleFormatted };
        } else {
          updated.push({ tokenId, value: availableLocaleFormatted });
        }
        return updated;
      });

      debouncedAmountDispatch(tokenId, availableLocaleFormatted, decimals);
    },
    [
      assetsFromStateMachine,
      assetInputValues,
      isFlowOpen,
      sendFlowState,
      setAssetInputValues,
      debouncedAmountDispatch,
      trackEvent,
    ],
  );

  const handleQrCodePress = async () => {
    // Camera permission handled inside QrScanner screen
    trackEvent('send | qr code | press');
    navigate(SheetRoutes.QrScanner, {});
  };

  const handleContactsPress = useCallback(() => {
    if (!selectedAccountId) return;
    trackEvent('send | address book | press');
    navigate(SheetRoutes.AddressBook, {
      accountId: selectedAccountId,
    });
  }, [selectedAccountId, navigate, trackEvent]);

  // Debounced dispatch to Redux for address
  const debouncedAddressDispatch = useMemo(
    () =>
      debounce(500, (value: string) => {
        trackEventRef.current('send | recipient address change');
        dispatchFormDataChanged({
          data: {
            fieldName: 'address',
            value,
          },
        });
      }),
    [dispatchFormDataChanged],
  );

  const debouncedFormatInput = useMemo(
    () =>
      debounce(500, (tokenId: TokenId) => {
        setAssetInputValues(previous => {
          const targetIndex = previous.findIndex(
            item => item.tokenId === tokenId,
          );
          if (targetIndex === -1) return previous;

          const targetValue = previous[targetIndex].value;

          if (!targetValue || targetValue.trim() === '') return previous;

          const { decimalSeparator } = getLocaleSeparators();

          // Count decimal separators in the value
          const decimalSeparatorRegex =
            decimalSeparator === '.'
              ? /\./g
              : new RegExp(decimalSeparator, 'g');
          const decimalCount = (targetValue.match(decimalSeparatorRegex) || [])
            .length;

          // If value ends with a single decimal separator, allow it
          // (user is in the middle of typing decimal digits)
          if (decimalCount === 1 && targetValue.endsWith(decimalSeparator)) {
            return previous;
          }

          // If there are multiple decimal separators, remove extras
          if (decimalCount > 1) {
            const parts = targetValue.split(decimalSeparator);
            // Keep only the first decimal separator: join first two parts, discard rest
            const cleanedValue =
              parts[0] + decimalSeparator + parts.slice(1).join('');

            return previous.map((item, index) =>
              index === targetIndex ? { ...item, value: cleanedValue } : item,
            );
          }

          // Count how many decimal digits the user typed (to preserve trailing zeros)
          const decimalPart = targetValue.split(decimalSeparator)[1] || '';
          // Keep only digits when counting decimal places (removes invalid characters)
          const cleanDecimalPart = decimalPart.replace(/\D/g, '');
          const userTypedDecimals = cleanDecimalPart.length;

          const raw = parseLocaleNumber(targetValue);

          // Format with at least as many decimal places as the user typed
          // This preserves trailing zeros like "55555.0" → "55.555,0"
          // Uses valueToLocale for arbitrary precision (important for crypto amounts)
          const formatted = valueToLocale(raw, userTypedDecimals, 20);

          if (formatted === targetValue) return previous;

          return previous.map((item, index) =>
            index === targetIndex ? { ...item, value: formatted } : item,
          );
        });
      }),
    [setAssetInputValues],
  );

  // Get current blockchainSpecific value for merging with memo updates
  const currentBlockchainSpecific = isFlowOpen
    ? sendFlowState.form.blockchainSpecific?.value
    : undefined;

  const currentBlockchainSpecificRef = useRef(currentBlockchainSpecific);
  currentBlockchainSpecificRef.current = currentBlockchainSpecific;

  // Debounced dispatch to Redux for note/memo changes (reads latest merge base from ref)
  const debouncedNoteDispatch = useMemo(
    () =>
      debounce(500, (value: string) => {
        trackEventRef.current('send | note change');
        const latest = currentBlockchainSpecificRef.current;
        dispatchFormDataChanged({
          data: {
            fieldName: 'blockchainSpecific',
            value: {
              ...(latest as object),
              memo: value,
            },
          },
        });
      }),
    [dispatchFormDataChanged],
  );

  // Cleanup debounced handlers on unmount
  useEffect(() => {
    return () => {
      debouncedAddressDispatch.cancel();
      debouncedAmountDispatch.cancel();
      debouncedNoteDispatch.cancel();
      debouncedFormatInput.cancel();
      debouncedTrackAssetInputChange.cancel();
    };
  }, [
    debouncedAddressDispatch,
    debouncedAmountDispatch,
    debouncedNoteDispatch,
    debouncedFormatInput,
    debouncedTrackAssetInputChange,
  ]);

  const handleNoteChange = useCallback(
    (value: string) => {
      setNote(value); // Update local state immediately for responsive UI
      debouncedNoteDispatch(value); // Debounced Redux update + analytics
    },
    [setNote, debouncedNoteDispatch],
  );

  const handleClearNote = useCallback(() => {
    trackEvent('send | note clear');
    setNote('');
    debouncedNoteDispatch.cancel();
    dispatchFormDataChanged({
      data: {
        fieldName: 'blockchainSpecific',
        value: {
          ...(currentBlockchainSpecificRef.current as object),
          memo: '',
        },
      },
    });
  }, [setNote, debouncedNoteDispatch, dispatchFormDataChanged, trackEvent]);

  const handleRecipientAddressChange = useCallback(
    (value: string) => {
      setRecipientAddress(value); // Update local state immediately
      debouncedAddressDispatch(value); // Debounced Redux update + analytics
    },
    [debouncedAddressDispatch],
  );

  const handleInputChange = useCallback(
    (index: number, localeValue: string) => {
      if (!isFlowOpen) return;

      const transfer = sendFlowState.form.tokenTransfers[index];
      if (transfer?.token.value.metadata?.isNft) return;

      const tokenId = transfer?.token.value.tokenId;
      if (!tokenId) return;

      const decimals = transfer.token.value.decimals || 0;

      setAssetInputValues(previous => {
        const updated = [...previous];
        const existingIndex = updated.findIndex(
          item => item.tokenId === tokenId,
        );

        if (existingIndex >= 0) {
          updated[existingIndex] = { tokenId, value: localeValue };
        } else {
          updated.push({ tokenId, value: localeValue });
        }
        return updated;
      });

      debouncedAmountDispatch(tokenId, localeValue, decimals);
      debouncedTrackAssetInputChange(index); // Debounced analytics
      debouncedFormatInput(tokenId);
    },
    [
      isFlowOpen,
      sendFlowState,
      setAssetInputValues,
      debouncedAmountDispatch,
      debouncedTrackAssetInputChange,
      debouncedFormatInput,
    ],
  );

  const handleReviewTransactionPress = () => {
    // TODO: handle isFormValid
    if (!selectedAccountId || !recipientAddress) return;

    const account = accounts.find(
      accumulator => accumulator.accountId === selectedAccountId,
    );
    if (!account) return;

    trackEvent('send | review transaction | press');
    // this is to ensure state machine has latest values, otherwise the review transaction sheet won't properly update the token values
    debouncedAddressDispatch.flush();
    debouncedAmountDispatch.flush();
    debouncedNoteDispatch.flush();

    // Only dispatch confirm - navigation happens reactively via useEffect when state becomes 'Summary'
    dispatchConfirm();
  };

  // Reactive navigation: navigate to ReviewTransaction when state machine transitions to Summary
  useEffect(() => {
    const currentRoute = NavigationControls.sheets.getCurrentRoute();
    const isAlreadyOnReview = currentRoute === SheetRoutes.ReviewTransaction;

    if (sendFlowState.status === 'Summary' && !isAlreadyOnReview) {
      const account = accounts.find(
        accumulator => accumulator.accountId === selectedAccountId,
      );
      if (account) {
        navigate(SheetRoutes.ReviewTransaction, {
          accountId: account.accountId,
          accountName: account.metadata?.name,
          blockchainName: account.blockchainName,
        });
      }
    }
  }, [sendFlowState.status, accounts, selectedAccountId, navigate]);

  const handleRemoveAsset = (tokenId: string) => {
    trackEvent('send | remove asset');
    dispatchFormDataChanged({
      data: {
        fieldName: 'tokenTransfers.removeToken',
        id: TokenId(tokenId),
      },
    });
    // Also remove from local assetInputValues to prevent stale values
    setAssetInputValues(previous =>
      previous.filter(item => item.tokenId !== tokenId),
    );
  };

  const onSelectAccount = useCallback(
    (accountId: AccountId) => {
      trackEvent('send | select account', { accountId });
      // Close current flow and reopen with new accountId
      dispatchClosed();
      dispatchOpenRequested({
        accountId: accountId,
      });
    },
    [dispatchClosed, dispatchOpenRequested, trackEvent],
  );

  const accountText = useMemo(() => {
    return accounts.length > 1
      ? t('v2.send-flow.form.accounts.text')
      : t('v2.send-flow.form.account.text');
  }, [accounts, t]);

  const copies = {
    headerTitle: t('v2.send-flow.sheet-title'),
    sourceAccountLabel: t('v2.send-flow.form.empty-account.label'),
    recipientLabel: t('v2.send-flow.address.label'),
    assetsTitle: t('v2.send-flow.form.tokens.title'),
    reviewTransactionLabel: t('v2.send-flow.form.review-transaction.label'),
    accountDropdownTitle: t(
      'v2.send-flow.form.empty-account.dropdown-placeholder',
    ),
    balanceLabel: t('v2.send-flow.form.balance-label'),
    noteLabel: t('v2.send-flow.form.empty-note-placeholder', {
      length: NOTE_SECTION_MAX_LENGTH,
    }),
    estimatedFeeLabel: t('v2.send-flow.review-transaction.estimated-fee'),
    accountText,
    customFeeLabel: t('v2.send-flow.form.custom-fee-label'),
    assetErrors: assetErrorsFromStateMachine,
    addButtonLabel: t('v2.send-flow.form.add-asset-button-label'),
    maxButtonLabel: t('v2.send-flow.form.max-button-label'),
  };

  const isReviewTransactionEnabled = useMemo(
    () => sendFlowState.status === 'Form' && sendFlowState.confirmButtonEnabled,
    [sendFlowState],
  );

  const sheetFooterTitleRow = useMemo(() => {
    const SheetFooterTitleRowComponent =
      sendFlowSheetUICustomisation?.SheetFooterTitleRow;
    if (!SheetFooterTitleRowComponent) return undefined;
    return React.createElement(SheetFooterTitleRowComponent);
  }, [sendFlowSheetUICustomisation?.SheetFooterTitleRow]);

  // Only allow adding assets if there are more tokens available than already selected
  const isAddAssetButtonEnabled = useMemo(() => {
    return (
      selectedAccountId !== null &&
      tokens.length > assetsFromStateMachine.length
    );
  }, [selectedAccountId, tokens, assetsFromStateMachine]);

  // Initialize send flow state machine on mount
  useEffect(() => {
    if (
      sendFlowState.status !== 'Idle' &&
      sendFlowState.status !== 'DiscardingTx'
    ) {
      return;
    }

    const firstSelected = assetsSelected?.[0];
    const isLovelaceRequired =
      !!firstSelected &&
      firstSelected.blockchainName === 'Cardano' &&
      firstSelected.tokenId !== TokenId('lovelace') &&
      (assetsSelected?.length ?? 0) === 1;

    if (isLovelaceRequired) {
      if (!lovelaceTokenForInitialSend) {
        return;
      }
      pendingInitialAdditionalTokensRef.current = [firstSelected];
      dispatchOpenRequested({
        initialSelectedToken: lovelaceTokenForInitialSend,
        accountId: initialAccountId ?? firstSelected.accountId,
      });
      return;
    }

    pendingInitialAdditionalTokensRef.current =
      assetsSelected && assetsSelected.length > 1
        ? assetsSelected.slice(1)
        : null;

    dispatchOpenRequested({
      initialSelectedToken: firstSelected,
      accountId: initialAccountId,
    });
  }, [
    sendFlowState.status,
    dispatchOpenRequested,
    assetsSelected,
    initialAccountId,
    lovelaceTokenForInitialSend,
  ]);

  // Initialize local recipient address from state machine when flow opens
  useEffect(() => {
    if (isFlowOpen) {
      setRecipientAddress(addressFromStateMachine);
    }
  }, [isFlowOpen, addressFromStateMachine, setRecipientAddress]);

  // Initialize local note from state machine when flow opens
  useEffect(() => {
    if (isFlowOpen) {
      setNote(memoFromStateMachine);
    }
  }, [isFlowOpen, memoFromStateMachine, setNote]);

  // Set initial recipient address from navigation params
  useEffect(() => {
    if (initialRecipientAddress) {
      // Update local state immediately for instant visual feedback
      setRecipientAddress(initialRecipientAddress);

      // Dispatch to Redux state machine when flow is open
      if (isFlowOpen) {
        dispatchFormDataChanged({
          data: {
            fieldName: 'address',
            value: initialRecipientAddress,
          },
        });
      }
    }
  }, [
    initialRecipientAddress,
    isFlowOpen,
    dispatchFormDataChanged,
    setRecipientAddress,
  ]);

  // Append route-selected tokens once the state machine accepts transfer edits
  // (not during Preparing / FormPendingValidation).
  useEffect(() => {
    const canEditTokenTransfers =
      sendFlowState.status === 'Form' ||
      sendFlowState.status === 'FormTxBuilding';
    if (!canEditTokenTransfers) return;

    const pending = pendingInitialAdditionalTokensRef.current;
    if (!pending?.length) return;

    pendingInitialAdditionalTokensRef.current = null;
    dispatchFormDataChanged({
      data: {
        fieldName: 'tokenTransfers.addTokens',
        tokens: pending,
      },
    });
  }, [sendFlowState.status, dispatchFormDataChanged]);

  const sendSheetProps = {
    copies,
    sheetFooterTitleRow,
    values: {
      selectedAccountId,
      accounts: accountData,
      noteValue: note ?? '',
      estimatedFee,
      maxAmountAssetIndex,
      assetsToSend: assetsFromStateMachine,
      addressSelected: recipientAddress || undefined,
      assetInputValues: mergedAssetInputValues,
    },
    utils: {
      isReviewTransactionEnabled,
      isAddAssetButtonEnabled:
        isAddAssetButtonEnabled && canSendMoreThanOneAsset,
      noteSectionLength: NOTE_SECTION_MAX_LENGTH,
      shouldShowNoteSection,
      shouldShowMaxButton,
      shouldShowRemoveAsset,
      recipientErrorMessage,
      txBuildError,
      theme,
      shouldShowFiatConversion,
      NoticeComponent,
      FeeSection,
    },
    actions: {
      onQrCodePress: handleQrCodePress,
      onContactsPress: handleContactsPress,
      onAddAssetPress: handleAddAsset,
      onRemoveAsset: handleRemoveAsset,
      onMaxAmountPress: handleMaxAmountPress,
      onReviewTransactionPress: handleReviewTransactionPress,
      onSelectAccount,
      onNoteChange: handleNoteChange,
      handleInputChange,
      onClearNote: handleClearNote,
      onRecipientAddressChange: handleRecipientAddressChange,
    },
  };

  return {
    sendSheetProps,
  };
};
