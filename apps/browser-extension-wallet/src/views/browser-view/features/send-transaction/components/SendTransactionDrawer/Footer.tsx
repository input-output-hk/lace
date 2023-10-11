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
  useAnalyticsSendFlowTriggerPoint
} from '../../store';
import { useHandleClose } from './Header';
import { useWalletStore } from '@src/stores';
import { AddressFormFooter } from './AddressFormFooter';
import { METADATA_MAX_LENGTH, sectionsConfig } from '../../constants';
import { useHandleResolver, useNetwork, useSendEvent, useWalletManager } from '@hooks';
import {
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsEventNames,
  PostHogAction
} from '@providers/AnalyticsProvider/analyticsTracker';
import { buttonIds } from '@hooks/useEnterKeyPress';
import { AssetPickerFooter } from './AssetPickerFooter';
import { clearTemporaryTxDataFromStorage, getTemporaryTxDataFromStorage } from '../../helpers';
import { ACTIONS, AddressActionsModal } from '@src/features/address-book/components/AddressActionsModal';
import { useAddressBookStore } from '@src/features/address-book/store';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { AddressBookSchema } from '@lib/storage';
import { getAddressToSave } from '@src/utils/validators';
import { useAnalyticsContext } from '@providers';

const { SendTransaction: Events, AddressBook } = AnalyticsEventNames;

export const nextStepBtnLabels: Partial<Record<Sections, string>> = {
  [Sections.FORM]: 'browserView.transaction.send.footer.review',
  [Sections.SUMMARY]: 'browserView.transaction.send.footer.confirm',
  [Sections.CONFIRMATION]: 'browserView.transaction.send.footer.confirm',
  [Sections.SUCCESS_TX]: 'browserView.transaction.send.footer.viewTransaction',
  [Sections.FAIL_TX]: 'browserView.transaction.send.footer.fail',
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
    const { hasInvalidOutputs, outputMap } = useTransactionProps();
    const { builtTxData } = useBuiltTxState();
    const { setSection, currentSection } = useSections();
    const { setSubmitingTxState, isSubmitingTx, isPasswordValid } = useSubmitingState();
    const { inMemoryWallet, getKeyAgentType } = useWalletStore();
    const { password, removePassword } = usePassword();
    const [metadata] = useMetadata();
    const { onClose, onCloseSubmitedTransaction } = useHandleClose();
    const { executeWithPassword } = useWalletManager();
    const analytics = useAnalyticsContext();
    const isOnline = useNetwork();
    const [selectedId, setSelectedId] = useState<number | null>();
    const [action, setAction] = useState<typeof ACTIONS.UPDATE | typeof ACTIONS.DELETE | null>();
    const { addressToEdit } = useAddressBookStore() as { addressToEdit: AddressBookSchema };
    const { list: addressList, utils } = useAddressBookContext();
    const { updateRecord: updateAddress, deleteRecord: deleteAddress } = utils;
    const sendEvent = useSendEvent(MatomoEventActions.CLICK_EVENT, MatomoEventCategories.SEND_TRANSACTION);
    const handleResolver = useHandleResolver();

    const sendEventToMatomo = useCallback(
      (name: string, value?: number) =>
        analytics.sendEventToMatomo({
          action: MatomoEventActions.CLICK_EVENT,
          category: MatomoEventCategories.SEND_TRANSACTION,
          name,
          value
        }),
      [analytics]
    );

    const isSummaryStep = currentSection.currentSection === Sections.SUMMARY;

    const sendEventToPostHog = (evtAction: PostHogAction) =>
      analytics.sendEventToPostHog(evtAction, { trigger_point: triggerPoint });

    const sendAnalytics = useCallback(() => {
      switch (currentSection.currentSection) {
        case Sections.FORM: {
          sendEventToMatomo(isPopupView ? Events.REVIEW_TX_DETAILS_POPUP : Events.REVIEW_TX_DETAILS_BROWSER);
          sendEventToPostHog(PostHogAction.SendTransactionDataReviewTransactionClick);
          break;
        }
        case Sections.SUMMARY: {
          sendEventToMatomo(isPopupView ? Events.CONFIRM_TX_DETAILS_POPUP : Events.CONFIRM_TX_DETAILS_BROWSER);
          sendEventToPostHog(PostHogAction.SendTransactionSummaryConfirmClick);
          break;
        }
        case Sections.CONFIRMATION: {
          sendEventToMatomo(isPopupView ? Events.INPUT_TX_PASSWORD_POPUP : Events.INPUT_TX_PASSWORD_BROWSER);
          sendEventToPostHog(PostHogAction.SendTransactionConfirmationConfirmClick);
          break;
        }
        case Sections.SUCCESS_TX: {
          sendEventToMatomo(isPopupView ? Events.SUCCESS_VIEW_TX_POPUP : Events.SUCCESS_VIEW_TX_BROWSER);
          sendEventToPostHog(PostHogAction.SendAllDoneViewTransactionClick);
          break;
        }
        case Sections.FAIL_TX: {
          sendEventToMatomo(isPopupView ? Events.FAIL_BACK_POPUP : Events.FAIL_BACK_BROWSER);
          sendEventToPostHog(PostHogAction.SendSomethingWentWrongBackClick);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSection.currentSection, isPopupView, sendEventToMatomo]);

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
      if (action === ACTIONS.DELETE) {
        sendEvent(isPopupView ? AddressBook.CANCEL_DELETE_ADDRESS_POPUP : AddressBook.CANCEL_DELETE_ADDRESS_BROWSER);
      } else {
        sendEvent(isPopupView ? AddressBook.CANCEL_UPDATE_ADDRESS_POPUP : AddressBook.CANCEL_UPDATE_ADDRESS_BROWSER);
      }
      setSelectedId(null);
    };

    const onHandleConfirm = async () => {
      // eslint-disable-next-line unicorn/no-null
      setSelectedId(null);

      if (action === 'DELETE') {
        sendEvent(
          isPopupView
            ? AddressBook.CONFIRM_DELETE_UPDATE_ADDRESS_POPUP
            : AddressBook.CONFIRM_DELETE_UPDATE_ADDRESS_BROWSER
        );
        deleteAddress(selectedId, {
          text: t('browserView.addressBook.toast.deleteAddress'),
          icon: DeleteIcon
        });
      } else {
        sendEvent(isPopupView ? AddressBook.CONFIRM_UPDATE_ADDRESS_POPUP : AddressBook.CONFIRM_UPDATE_ADDRESS_BROWSER);
        const addressToSave = await getAddressToSave({ address: addressToEdit, handleResolver });
        await updateAddress(selectedId, addressToSave, {
          text: t('browserView.addressBook.toast.editAddress'),
          icon: EditIcon
        });
      }

      onHandleChangeConfirm(action);
    };

    const keyAgentType = getKeyAgentType();
    const isInMemory = useMemo(() => keyAgentType === Wallet.KeyManagement.KeyAgentType.InMemory, [keyAgentType]);
    const isHwSummary = useMemo(() => isSummaryStep && !isInMemory, [isSummaryStep, isInMemory]);

    const signAndSubmitTransaction = useCallback(async () => {
      const { tx } = await builtTxData.tx.sign();
      await inMemoryWallet.submitTx(tx);
    }, [builtTxData, inMemoryWallet]);

    const handleVerifyPass = useCallback(async () => {
      if (isSubmitingTx) return;

      setSubmitingTxState({ isPasswordValid: true, isSubmitingTx: true });
      try {
        await signAndSubmitTransaction();
        removePassword();
        // Send amount of bundles as value
        sendEvent(isPopupView ? Events.TX_SUCCESS_POPUP : Events.TX_SUCCESS_BROWSER, outputMap.size);
        setSection({ currentSection: Sections.SUCCESS_TX });
        setSubmitingTxState({ isPasswordValid: true, isSubmitingTx: false });
      } catch (error) {
        removePassword();
        // Error name is 'AuthenticationError' in dev build but 'W' in prod build
        if (error.message?.includes('Authentication failure')) {
          setSubmitingTxState({ isPasswordValid: false, isSubmitingTx: false });
        } else {
          // TODO: identify the errors and give them a value to send it with the event and track it [LW-6497]
          sendEvent(isPopupView ? Events.TX_FAIL_POPUP : Events.TX_FAIL_BROWSER);
          setSection({ currentSection: Sections.FAIL_TX });
          setSubmitingTxState({ isSubmitingTx: false });
        }
      }
    }, [
      isPopupView,
      isSubmitingTx,
      outputMap,
      removePassword,
      sendEvent,
      setSection,
      setSubmitingTxState,
      signAndSubmitTransaction
    ]);

    const onConfirm = useCallback(() => {
      sendAnalytics();
      const isConfirmPass = currentSection.currentSection === Sections.CONFIRMATION;
      const txHasSucceeded = currentSection.currentSection === Sections.SUCCESS_TX;
      const txHasFailed = currentSection.currentSection === Sections.FAIL_TX;
      const isReviewingAddress = currentSection.currentSection === Sections.ADDRESS_CHANGE;

      if (hasTempTxData()) {
        clearTemporaryTxDataFromStorage();
      }

      switch (true) {
        case isReviewingAddress:
          return handleReviewAddress('UPDATE');
        case isSummaryStep && !isInMemory:
          if (isPopupView) {
            return openContinueDialog();
          }
          return handleVerifyPass();
        case isConfirmPass:
          return executeWithPassword(password, handleVerifyPass);
        case txHasSucceeded:
          return onCloseSubmitedTransaction();
        case txHasFailed:
          setSubmitingTxState({ isPasswordValid: true });
          return setSection(sectionsConfig.form);
        default:
          return setSection();
      }
    }, [
      currentSection.currentSection,
      isSummaryStep,
      isInMemory,
      isPopupView,
      handleVerifyPass,
      executeWithPassword,
      password,
      onCloseSubmitedTransaction,
      setSubmitingTxState,
      setSection,
      openContinueDialog,
      sendAnalytics,
      handleReviewAddress
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
      () => !builtTxData.tx || hasInvalidOutputs || metadata?.length > METADATA_MAX_LENGTH,
      [builtTxData.tx, hasInvalidOutputs, metadata]
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
          : t('browserView.transaction.send.footer.confirmWithDevice', { hardwareWallet: keyAgentType });
        return isSubmitingTx ? t('browserView.transaction.send.footer.signing') : staleLabels;
      }

      return t(nextStepBtnLabels[currentSection.currentSection]);
    }, [isHwSummary, t, currentSection.currentSection, isPopupView, isSubmitingTx, keyAgentType]);

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
