/* eslint-disable no-magic-numbers */
/* eslint-disable camelcase */
/* eslint-disable max-statements */
/* eslint-disable unicorn/no-null */
/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, logger } from '@lace/common';
import { Wallet } from '@lace/cardano';
import styles from './Footer.module.scss';
import EditIcon from '@assets/icons/edit.component.svg';
import DeleteIcon from '@assets/icons/delete-icon.component.svg';

import { Sections } from '../../types';
import {
  useSections,
  useBuiltTxState,
  useSubmitingState,
  useTransactionProps,
  useMetadata,
  useAnalyticsSendFlowTriggerPoint
} from '../../store';
import { useHandleClose } from './Header';
import { useWalletStore } from '@src/stores';
import { AddressFormFooter } from './AddressFormFooter';
import { METADATA_MAX_LENGTH, sectionsConfig } from '../../constants';
import { useHandleResolver, useNetwork, useSharedWalletData, useSignPolicy } from '@hooks';
import { PostHogAction, TxCreationType, TX_CREATION_TYPE_KEY } from '@providers/AnalyticsProvider/analyticsTracker';
import { buttonIds } from '@hooks/useEnterKeyPress';
import { AssetPickerFooter } from './AssetPickerFooter';
import { clearTemporaryTxDataFromStorage, getTemporaryTxDataFromStorage } from '../../helpers';
import { ACTIONS, AddressActionsModal } from '@src/features/address-book/components/AddressActionsModal';
import { useAddressBookStore } from '@src/features/address-book/store';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { AddressBookSchema } from '@lib/storage';
import { getAddressToSave } from '@src/utils/validators';
import { useAnalyticsContext } from '@providers';
import { txSubmitted$ } from '@providers/AnalyticsProvider/onChain';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';
import type { TranslationKey } from '@lace/translation';
import { Serialization } from '@cardano-sdk/core';
import { exportMultisigTransaction, PasswordObj, useSecrets } from '@lace/core';
import { WalletType } from '@cardano-sdk/web-extension';

export const nextStepBtnLabels: Partial<Record<Sections, TranslationKey>> = {
  [Sections.FORM]: 'browserView.transaction.send.footer.review',
  [Sections.IMPORT_SHARED_WALLET_TRANSACTION_JSON]: 'browserView.transaction.send.coSign.footer.continue',
  [Sections.SUMMARY]: 'browserView.transaction.send.footer.confirm',
  [Sections.CONFIRMATION]: 'browserView.transaction.send.footer.confirm',
  [Sections.SUCCESS_TX]: 'browserView.transaction.send.footer.viewTransaction',
  [Sections.FAIL_TX]: 'browserView.transaction.send.footer.fail',
  [Sections.UNAUTHORIZED_TX]: 'browserView.transaction.send.footer.unauthorized',
  [Sections.ADDRESS_FORM]: 'browserView.transaction.send.footer.save',
  [Sections.ADDRESS_CHANGE]: 'addressBook.reviewModal.confirmUpdate.button'
};

const hasTempTxData = () => {
  const { tempOutputs, tempAddress } = getTemporaryTxDataFromStorage();
  return tempOutputs !== null || tempAddress !== null;
};

interface FooterProps {
  onHandleChangeCancel?: () => void;
  onHandleChangeConfirm?: (action?: string) => void;
  isPopupView?: boolean;
  openContinueDialog?: () => void;
}

export const Footer = withAddressBookContext(
  ({ isPopupView, openContinueDialog, onHandleChangeConfirm }: FooterProps): React.ReactElement => {
    const confirmRef = useRef<HTMLButtonElement>();
    const triggerSubmit = () => confirmRef.current?.click();
    const { t } = useTranslation();
    const { triggerPoint } = useAnalyticsSendFlowTriggerPoint();
    const { hasInvalidOutputs } = useTransactionProps();
    const { builtTxData, setBuiltTxData } = useBuiltTxState();
    const { setSection, currentSection } = useSections();
    const { setSubmitingTxState, isSubmitingTx, isPasswordValid } = useSubmitingState();
    const { inMemoryWallet, isInMemoryWallet, walletType, isSharedWallet, currentChain } = useWalletStore();
    const { password, clearSecrets: removePassword } = useSecrets();
    const [metadata] = useMetadata();
    const { onClose, onCloseSubmitedTransaction } = useHandleClose();
    const analytics = useAnalyticsContext();
    const isOnline = useNetwork();
    const [selectedId, setSelectedId] = useState<number | null>();
    const [action, setAction] = useState<typeof ACTIONS.UPDATE | typeof ACTIONS.DELETE | null>();
    const { addressToEdit } = useAddressBookStore() as { addressToEdit: AddressBookSchema };
    const { list: addressList, utils } = useAddressBookContext();
    const { updateRecord: updateAddress, deleteRecord: deleteAddress } = utils;
    const handleResolver = useHandleResolver();
    const { sharedWalletKey } = useSharedWalletData();
    const policy = useSignPolicy('payment');

    const isSummaryStep = currentSection.currentSection === Sections.SUMMARY;

    const sendEventToPostHog = (evtAction: PostHogAction) =>
      analytics.sendEventToPostHog(evtAction, {
        trigger_point: triggerPoint,
        [TX_CREATION_TYPE_KEY]: TxCreationType.Internal
      });

    const sendAnalytics = useCallback(() => {
      switch (currentSection.currentSection) {
        case Sections.FORM: {
          const event = isSharedWallet
            ? 'SharedWalletsSendTxDataReviewTxClick'
            : 'SendTransactionDataReviewTransactionClick';
          sendEventToPostHog(PostHogAction[event]);
          break;
        }
        case Sections.SUMMARY: {
          const event = isSharedWallet
            ? 'SharedWalletsSendTxSummaryConfirmClick'
            : 'SendTransactionSummaryConfirmClick';
          builtTxData.importedSharedWalletTx
            ? sendEventToPostHog(PostHogAction.SharedWalletsCosignTxSummaryConfirmClick)
            : sendEventToPostHog(PostHogAction[event]);
          break;
        }
        case Sections.CONFIRMATION: {
          const event = isSharedWallet
            ? 'SharedWalletsSendTxConfirmationConfirmClick'
            : 'SendTransactionConfirmationConfirmClick';
          builtTxData.importedSharedWalletTx
            ? sendEventToPostHog(PostHogAction.SharedWalletsCosignTxConfirmationClick)
            : sendEventToPostHog(PostHogAction[event]);
          break;
        }
        case Sections.SUCCESS_TX: {
          const event = isSharedWallet ? 'SharedWalletsSendAllDoneViewTxClick' : 'SendAllDoneViewTransactionClick';
          sendEventToPostHog(PostHogAction[event]);
          break;
        }
        case Sections.UNAUTHORIZED_TX:
        case Sections.FAIL_TX: {
          const event = isSharedWallet
            ? 'SharedWalletsSendSomethingWentWrongBackClick'
            : 'SendSomethingWentWrongBackClick';
          sendEventToPostHog(PostHogAction[event]);
          break;
        }
        case Sections.IMPORT_SHARED_WALLET_TRANSACTION_JSON: {
          sendEventToPostHog(PostHogAction.SharedWalletsCosignTxContinueClick);
          break;
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSection.currentSection, isPopupView, isSharedWallet]);

    const handleReviewAddress = useCallback(
      (result: keyof typeof ACTIONS) => {
        const address = (addressList as AddressBookSchema[]).find((item) => item.address === addressToEdit.address);
        setSelectedId(address.id);
        setAction(result);
        sendAnalytics();
      },
      [addressList, addressToEdit.address, sendAnalytics]
    );

    const onHandleCancel = () => {
      // eslint-disable-next-line unicorn/no-null
      setSelectedId(null);
    };

    const onHandleConfirm = async () => {
      // eslint-disable-next-line unicorn/no-null
      setSelectedId(null);

      if (action === 'DELETE') {
        deleteAddress(selectedId, {
          text: t('browserView.addressBook.toast.deleteAddress'),
          icon: DeleteIcon
        });
      } else {
        const addressToSave = await getAddressToSave({ address: addressToEdit, handleResolver });
        await updateAddress(selectedId, addressToSave, {
          text: t('browserView.addressBook.toast.editAddress'),
          icon: EditIcon
        });
      }

      onHandleChangeConfirm(action);
    };

    const isHwSummary = isSummaryStep && !isInMemoryWallet && !isSharedWallet;

    const signAndSubmitTransaction = useCallback(async () => {
      if (isSharedWallet) {
        let sharedWalletTx: Serialization.Transaction;
        try {
          if (builtTxData.importedSharedWalletTx) {
            sharedWalletTx = Serialization.Transaction.fromCbor(
              await inMemoryWallet.addSignatures({ tx: builtTxData.importedSharedWalletTx.toCbor() })
            );
            builtTxData.importedSharedWalletTx.setWitnessSet(sharedWalletTx.witnessSet());
          } else {
            const { auxiliaryData, body, hash } = await builtTxData.tx.inspect();
            const signedTx = await inMemoryWallet.finalizeTx({
              tx: {
                body,
                hash
              },
              auxiliaryData
            });
            sharedWalletTx = Serialization.Transaction.fromCore(signedTx);
          }
        } catch (error) {
          logger.error('Shared wallet TX sign error', error);
          throw error;
        }

        const collectedEnoughSharedWalletTxSignatures =
          policy?.requiredCosigners === sharedWalletTx.toCore().witness.signatures.size;

        if (collectedEnoughSharedWalletTxSignatures) {
          try {
            await inMemoryWallet.submitTx(sharedWalletTx.toCbor());
          } catch (error) {
            logger.error('Shared wallet TX submit error', error);
            throw error;
          }
        } else {
          await exportMultisigTransaction({
            cborHex: sharedWalletTx.toCbor(),
            publicKey: sharedWalletKey,
            chainId: currentChain
          });
        }

        setBuiltTxData({ ...builtTxData, collectedEnoughSharedWalletTxSignatures });
      } else {
        const signedTx = await builtTxData.tx.sign();

        try {
          await inMemoryWallet.submitTx(signedTx);
        } catch (error) {
          logger.error('TX submit error', error);
          throw error;
        }
        txSubmitted$.next({
          id: signedTx.tx.id.toString(),
          date: new Date().toString(),
          creationType: TxCreationType.Internal
        });
      }
    }, [
      builtTxData,
      currentChain,
      inMemoryWallet,
      isSharedWallet,
      policy?.requiredCosigners,
      setBuiltTxData,
      sharedWalletKey
    ]);

    const handleVerifyPass = useCallback(
      async (passphrase: Partial<PasswordObj>) => {
        if (isSubmitingTx) return;
        setSubmitingTxState({ isPasswordValid: true, isSubmitingTx: true });

        try {
          await withSignTxConfirmation(signAndSubmitTransaction, passphrase.value);
          // Send amount of bundles as value
          setSection({ currentSection: Sections.SUCCESS_TX });
          setSubmitingTxState({ isPasswordValid: true, isSubmitingTx: false });
        } catch (error) {
          if (error instanceof Wallet.KeyManagement.errors.AuthenticationError) {
            if (isHwSummary) {
              setSection({ currentSection: Sections.UNAUTHORIZED_TX });
              setSubmitingTxState({ isSubmitingTx: false });
            } else {
              setSubmitingTxState({ isPasswordValid: false, isSubmitingTx: false });
            }
          } else {
            setSection({ currentSection: Sections.FAIL_TX });
            setSubmitingTxState({ isSubmitingTx: false });
          }
        } finally {
          removePassword();
        }
      },
      [isSubmitingTx, removePassword, setSection, setSubmitingTxState, signAndSubmitTransaction, isHwSummary]
    );

    useEffect(() => {
      const isHardwareWallet = [WalletType.Ledger, WalletType.Trezor].includes(walletType);
      if (!isHardwareWallet || typeof navigator?.hid?.addEventListener !== 'function') return () => void 0;
      const onHardwareWalletDisconnect = (event: HIDConnectionEvent) => {
        if (event.device.opened) {
          setSection({ currentSection: Sections.FAIL_TX });
          setSubmitingTxState({ isSubmitingTx: false });
        }
      };

      navigator.hid.addEventListener('disconnect', onHardwareWalletDisconnect);

      return () => {
        navigator.hid.removeEventListener('disconnect', onHardwareWalletDisconnect);
      };
    }, [setSection, setSubmitingTxState, isPopupView, walletType]);

    const onConfirm = useCallback(
      (passphrase: Partial<PasswordObj>) => {
        sendAnalytics();
        const isConfirmPass = currentSection.currentSection === Sections.CONFIRMATION;
        const txHasSucceeded = currentSection.currentSection === Sections.SUCCESS_TX;
        const txHasFailed =
          currentSection.currentSection === Sections.FAIL_TX ||
          currentSection.currentSection === Sections.UNAUTHORIZED_TX;
        const isReviewingAddress = currentSection.currentSection === Sections.ADDRESS_CHANGE;

        if (hasTempTxData()) {
          clearTemporaryTxDataFromStorage();
        }

        switch (true) {
          case isReviewingAddress: {
            return handleReviewAddress('UPDATE');
          }
          case isSummaryStep && !isInMemoryWallet && !isSharedWallet: {
            if (isPopupView) {
              return openContinueDialog();
            }
            return handleVerifyPass(passphrase);
          }
          case isConfirmPass: {
            return handleVerifyPass(passphrase);
          }
          case txHasSucceeded: {
            // Tab is closed sooner than analytics are sent
            return setTimeout(() => onCloseSubmitedTransaction(), 300);
          }
          case txHasFailed: {
            setSubmitingTxState({ isPasswordValid: true });
            return setSection(sectionsConfig[Sections.FORM]);
          }
          default: {
            return setSection();
          }
        }
      },
      [
        currentSection.currentSection,
        handleReviewAddress,
        handleVerifyPass,
        isInMemoryWallet,
        isPopupView,
        isSharedWallet,
        isSummaryStep,
        onCloseSubmitedTransaction,
        openContinueDialog,
        sendAnalytics,
        setSection,
        setSubmitingTxState
      ]
    );

    const handleClose = () => {
      switch (currentSection.currentSection) {
        case Sections.SUCCESS_TX: {
          const event = isSharedWallet ? 'SharedWalletsSendAllDoneCloseClick' : 'SendAllDoneCloseClick';
          sendEventToPostHog(PostHogAction[event]);
          break;
        }
        case Sections.FAIL_TX: {
          const event = isSharedWallet
            ? 'SharedWalletsSendSomethingWentWrongCancelClick'
            : 'SendSomethingWentWrongCancelClick';
          sendEventToPostHog(PostHogAction[event]);
          break;
        }
        case Sections.IMPORT_SHARED_WALLET_TRANSACTION_JSON: {
          sendEventToPostHog(PostHogAction.SharedWalletsCosignTxCancelClick);
          break;
        }
        case Sections.SUMMARY: {
          sendEventToPostHog(PostHogAction.SharedWalletsCosignTxSummaryCancelClick);
          break;
        }
        // No default
      }

      setTimeout(() => {
        onClose();
      }, 300);
    };

    const confirmDisable = useMemo(
      () =>
        (!builtTxData.importedSharedWalletTx && (!builtTxData.tx || hasInvalidOutputs)) ||
        metadata?.length > METADATA_MAX_LENGTH,
      [builtTxData.importedSharedWalletTx, builtTxData.tx, hasInvalidOutputs, metadata?.length]
    );

    const isSubmitDisabled = useMemo(
      () =>
        currentSection.currentSection === Sections.CONFIRMATION &&
        (isSubmitingTx || !isPasswordValid || !password.value || !isOnline),
      [currentSection.currentSection, isSubmitingTx, isPasswordValid, password.value, isOnline]
    );

    const confirmButtonLabel = useMemo(() => {
      if (isHwSummary) {
        const staleLabels = isPopupView
          ? t('browserView.transaction.send.footer.continueInAdvancedView')
          : t('browserView.transaction.send.footer.confirmWithDevice', { hardwareWallet: walletType });
        return isSubmitingTx ? t('browserView.transaction.send.footer.signing') : staleLabels;
      }

      if (isSharedWallet && currentSection.currentSection === Sections.SUCCESS_TX) {
        return t('general.button.view-co-signers');
      }

      return t(nextStepBtnLabels[currentSection.currentSection]);
    }, [isHwSummary, isSharedWallet, currentSection.currentSection, t, isPopupView, walletType, isSubmitingTx]);

    const cancelButtonLabel = useMemo(() => {
      if (currentSection.currentSection === Sections.SUCCESS_TX) {
        return t('browserView.transaction.send.footer.close');
      } else if (currentSection.currentSection === Sections.ADDRESS_CHANGE) {
        return t('addressBook.reviewModal.cancelUpdate.button');
      }
      return t('browserView.transaction.send.footer.cancel');
    }, [t, currentSection.currentSection]);

    const isConfirmButtonDisabled =
      (confirmDisable || isSubmitDisabled) && currentSection.currentSection !== Sections.ADDRESS_CHANGE;

    const submitHwFormStep = useCallback(() => {
      triggerSubmit();
    }, []);

    /* eslint-disable consistent-return */
    useEffect(() => {
      const cleanup = () => {
        if (hasTempTxData()) {
          clearTemporaryTxDataFromStorage();
        }
      };
      if (isPopupView) return cleanup;
      if (isSubmitingTx) return cleanup;
      if (isConfirmButtonDisabled) return cleanup;

      const { tempSource } = getTemporaryTxDataFromStorage();
      if (hasTempTxData() && tempSource === 'hardware-wallet') {
        submitHwFormStep();
      }
    }, [isConfirmButtonDisabled, isHwSummary, isPopupView, isSubmitingTx, submitHwFormStep]);
    /* eslint-enable consistent-return */

    if ([Sections.ADDRESS_LIST, Sections.ADDRESS_FORM].includes(currentSection.currentSection)) return null;

    if (currentSection.currentSection === Sections.ASSET_PICKER) return <AssetPickerFooter />;

    if (currentSection.currentSection === Sections.ADDRESS_FORM) return <AddressFormFooter />;

    return (
      <>
        <div className={styles.footer}>
          <Button
            size="large"
            block
            disabled={isConfirmButtonDisabled}
            loading={isSubmitingTx}
            onClick={() => onConfirm(password)}
            ref={confirmRef}
            id={buttonIds.sendNextBtnId}
            data-testid="send-next-btn"
          >
            {confirmButtonLabel}
          </Button>
          <Button
            color="secondary"
            size="large"
            block
            onClick={
              currentSection.currentSection === Sections.ADDRESS_CHANGE
                ? () => handleReviewAddress('DELETE')
                : handleClose
            }
            data-testid="send-cancel-btn"
          >
            {cancelButtonLabel}
          </Button>
        </div>
        <AddressActionsModal
          action={action}
          onCancel={onHandleCancel}
          onConfirm={onHandleConfirm}
          visible={!!selectedId}
          isPopup={isPopupView}
        />
      </>
    );
  }
);
