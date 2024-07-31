/* eslint-disable camelcase */
/* eslint-disable max-statements */
/* eslint-disable unicorn/no-null */
/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@lace/common';
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
  usePassword,
  useMetadata,
  useAnalyticsSendFlowTriggerPoint,
  useMaxAdaStatus
} from '../../store';
import { useHandleClose } from './Header';
import { useWalletStore } from '@src/stores';
import { AddressFormFooter } from './AddressFormFooter';
import { METADATA_MAX_LENGTH, sectionsConfig } from '../../constants';
import { useHandleResolver, useLocalStorage, useNetwork, useSharedWalletData } from '@hooks';
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
import { exportMultisigTransaction, organizeMultiSigTransaction } from '@lace/core';
import { mergeWitnesses } from '@views/browser/features/send-transaction/components/SendTransactionDrawer/utils';

export const nextStepBtnLabels: Partial<Record<Sections, TranslationKey>> = {
  [Sections.FORM]: 'browserView.transaction.send.footer.review',
  [Sections.IMPORT_SHARED_WALLET_TRANSACTION_JSON]: 'browserView.transaction.send.footer.review',
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
    const { builtTxData } = useBuiltTxState();
    const { setSection, currentSection } = useSections();
    const { setSubmitingTxState, isSubmitingTx, isPasswordValid } = useSubmitingState();
    const { inMemoryWallet, isInMemoryWallet, walletType, isSharedWallet, currentChain } = useWalletStore();
    const { password, removePassword } = usePassword();
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
    const { isMaxAdaLoading } = useMaxAdaStatus();
    const { sharedWalletKey, getSignPolicy } = useSharedWalletData();
    const [sharedWalletTransactions, { updateLocalStorage: updateSharedWalletTransactions }] = useLocalStorage(
      'sharedWalletTransactions',
      []
    );

    const isSummaryStep = currentSection.currentSection === Sections.SUMMARY;

    const sendEventToPostHog = (evtAction: PostHogAction) =>
      analytics.sendEventToPostHog(evtAction, {
        trigger_point: triggerPoint,
        [TX_CREATION_TYPE_KEY]: TxCreationType.Internal
      });

    const sendAnalytics = useCallback(() => {
      switch (currentSection.currentSection) {
        case Sections.FORM: {
          sendEventToPostHog(PostHogAction.SendTransactionDataReviewTransactionClick);
          break;
        }
        case Sections.SUMMARY: {
          sendEventToPostHog(PostHogAction.SendTransactionSummaryConfirmClick);
          break;
        }
        case Sections.CONFIRMATION: {
          sendEventToPostHog(PostHogAction.SendTransactionConfirmationConfirmClick);
          break;
        }
        case Sections.SUCCESS_TX: {
          sendEventToPostHog(PostHogAction.SendAllDoneViewTransactionClick);
          break;
        }
        case Sections.UNAUTHORIZED_TX:
        case Sections.FAIL_TX: {
          sendEventToPostHog(PostHogAction.SendSomethingWentWrongBackClick);
          break;
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSection.currentSection, isPopupView]);

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
        try {
          let sharedWalletTx: Serialization.Transaction;
          if (builtTxData.importedSharedWalletTx) {
            const { auxiliaryData, body, id, witness } = builtTxData.importedSharedWalletTx.toCore();
            const txWithOwnSignature = await inMemoryWallet.finalizeTx({
              tx: {
                body,
                hash: id
              },
              auxiliaryData,
              bodyCbor: builtTxData.importedSharedWalletTx.body().toCbor()
            });
            builtTxData.importedSharedWalletTx.setWitnessSet(
              Serialization.TransactionWitnessSet.fromCore(mergeWitnesses(txWithOwnSignature.witness, witness))
            );
            sharedWalletTx = builtTxData.importedSharedWalletTx;
          } else {
            const signedTx = await inMemoryWallet.finalizeTx({
              tx: await builtTxData.tx.inspect()
            });
            sharedWalletTx = Serialization.Transaction.fromCore(signedTx);
          }

          updateSharedWalletTransactions([
            ...sharedWalletTransactions.filter((tx) => tx.id.toString() !== sharedWalletTx.toCore().id.toString()),
            {
              id: sharedWalletTx.toCore().id.toString(),
              tx: organizeMultiSigTransaction({
                cborHex: sharedWalletTx.toCbor(),
                publicKey: sharedWalletKey,
                chainId: currentChain
              })
            }
          ]);

          const policy = await getSignPolicy('payment');
          await (policy.requiredCosigners === sharedWalletTx.toCore().witness.signatures.size
            ? inMemoryWallet.submitTx(sharedWalletTx.toCbor())
            : exportMultisigTransaction({
                cborHex: sharedWalletTx.toCbor(),
                publicKey: sharedWalletKey,
                chainId: currentChain
              }));
        } catch (error) {
          console.error('DEBUG', error);
        }
      } else {
        const signedTx = await builtTxData.tx.sign();
        await inMemoryWallet.submitTx(signedTx);
        txSubmitted$.next({
          id: signedTx.tx.id.toString(),
          date: new Date().toString(),
          creationType: TxCreationType.Internal
        });
      }
    }, [
      builtTxData.importedSharedWalletTx,
      builtTxData.tx,
      currentChain,
      getSignPolicy,
      inMemoryWallet,
      isSharedWallet,
      sharedWalletKey,
      sharedWalletTransactions,
      updateSharedWalletTransactions
    ]);

    const handleVerifyPass = useCallback(async () => {
      if (isSubmitingTx) return;
      setSubmitingTxState({ isPasswordValid: true, isSubmitingTx: true });

      try {
        await withSignTxConfirmation(signAndSubmitTransaction, password);
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
    }, [
      isSubmitingTx,
      removePassword,
      setSection,
      setSubmitingTxState,
      signAndSubmitTransaction,
      password,
      isHwSummary
    ]);

    useEffect(() => {
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
    }, [setSection, setSubmitingTxState, isPopupView]);

    const onConfirm = useCallback(() => {
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
          return handleVerifyPass();
        }
        case isConfirmPass: {
          return handleVerifyPass();
        }
        case txHasSucceeded: {
          return onCloseSubmitedTransaction();
        }
        case txHasFailed: {
          setSubmitingTxState({ isPasswordValid: true });
          return setSection(sectionsConfig[Sections.FORM]);
        }
        default: {
          return setSection();
        }
      }
    }, [
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
    ]);

    const handleClose = () => {
      if (currentSection.currentSection === Sections.SUCCESS_TX) {
        sendEventToPostHog(PostHogAction.SendAllDoneCloseClick);
      } else if (currentSection.currentSection === Sections.FAIL_TX) {
        sendEventToPostHog(PostHogAction.SendSomethingWentWrongCancelClick);
      }

      onClose();
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
        (isSubmitingTx || !isPasswordValid || !password || !isOnline),
      [currentSection.currentSection, isSubmitingTx, isPasswordValid, password, isOnline]
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
      (confirmDisable || isSubmitDisabled || isMaxAdaLoading) &&
      currentSection.currentSection !== Sections.ADDRESS_CHANGE;

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

    if (currentSection.currentSection === Sections.IMPORT_SHARED_WALLET_TRANSACTION_JSON) return null;

    return (
      <>
        <div className={styles.footer}>
          <Button
            size="large"
            block
            disabled={isConfirmButtonDisabled}
            loading={isSubmitingTx}
            onClick={onConfirm}
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
