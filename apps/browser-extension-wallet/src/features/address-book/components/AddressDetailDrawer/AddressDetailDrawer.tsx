/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable complexity */
import React, { useEffect, useState } from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Button, toast, Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { EditAddressForm as AddressForm, valuesPropType, ValidationOptionsProps, FormKeys } from '@lace/core';
import { validateWalletName, validateWalletAddress } from '@src/utils/validators/address-book';
import { AddressDetailsSteps, AddressDetailsConfig, AddressDetailsSectionConfig } from './types';
import { DeleteAddressModal } from '../DeleteAddressModal';
import styles from './AddressDetailDrawer.module.scss';
import Copy from '@src/assets/icons/copy.component.svg';
import Icon from '@ant-design/icons';
import EditAddressFormFooter from '@src/features/address-book/components/AddressDetailDrawer/EditAddressFormFooter';
import { useAnalyticsContext } from '@providers';
import {
  AnalyticsEventActions,
  AnalyticsEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';
import { useKeyboardShortcut } from '@hooks';

const stepsConfiguration: AddressDetailsConfig = {
  [AddressDetailsSteps.DETAILS]: {
    currentSection: AddressDetailsSteps.DETAILS,
    nextSection: AddressDetailsSteps.EDIT,
    headerTitle: 'browserView.addressBook.addressDetail.title'
  },
  [AddressDetailsSteps.EDIT]: {
    currentSection: AddressDetailsSteps.EDIT,
    prevSection: AddressDetailsSteps.DETAILS,
    headerTitle: 'browserView.addressBook.editAddress.title'
  },
  [AddressDetailsSteps.CREATE]: {
    currentSection: AddressDetailsSteps.CREATE,
    headerTitle: 'browserView.addressBook.form.addNewAddress',
    headerSubtitle: 'browserView.addressBook.form.addNewSubtitle'
  }
};

type InitialValuesProps = {
  address?: string;
  id?: number;
  name?: string;
};

const validations: ValidationOptionsProps<FormKeys> = {
  name: validateWalletName,
  address: validateWalletAddress
};

export type AddressDetailDrawerProps = {
  initialStep: AddressDetailsSteps;
  initialValues: InitialValuesProps;
  onCancelClick: (event?: React.MouseEvent<HTMLButtonElement>) => unknown;
  onConfirmClick: (values: valuesPropType) => unknown;
  onDelete: (address: InitialValuesProps['id']) => unknown;
  visible: boolean;
  useNewAddressForm?: boolean;
  popupView?: boolean;
};

export const AddressDetailDrawer = ({
  initialStep,
  initialValues,
  onCancelClick,
  onConfirmClick,
  visible,
  onDelete,
  popupView
}: AddressDetailDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<number | null>();
  const [currentStepConfig, setCurrentStepConfig] = useState<AddressDetailsSectionConfig>(
    stepsConfiguration[initialStep]
  );
  const [formValues, setFormValues] = useState<valuesPropType>(initialValues || {});
  const analytics = useAnalyticsContext();

  useEffect(() => {
    setCurrentStepConfig(stepsConfiguration[initialStep]);
  }, [initialStep]);

  useEffect(() => {
    setFormValues(initialValues);
  }, [initialValues]);

  const onArrowIconClick = () =>
    popupView && (!stepsConfiguration[currentStepConfig.prevSection] || !initialValues?.id)
      ? onCancelClick()
      : setCurrentStepConfig(stepsConfiguration[currentStepConfig.prevSection]);

  useKeyboardShortcut(['Escape'], () => {
    if (selectedId) {
      // eslint-disable-next-line unicorn/no-null
      setSelectedId(null);
      return;
    }
    stepsConfiguration[currentStepConfig.prevSection] ? onArrowIconClick() : onCancelClick();
  });

  const getFieldError = (key: FormKeys) => validations[key]?.(formValues[key]);

  const handleOnCancelClick = () => {
    if (currentStepConfig.currentSection === AddressDetailsSteps.CREATE) {
      onCancelClick();
    } else {
      setCurrentStepConfig(stepsConfiguration[AddressDetailsSteps.DETAILS]);
    }
  };

  const sendAnalytics = (name: string) => {
    analytics.sendEvent({
      category: AnalyticsEventCategories.ADDRESS_BOOK,
      action: AnalyticsEventActions.CLICK_EVENT,
      name
    });
  };

  const editAddressFormTranslations = {
    walletName: t('core.addressForm.name'),
    address: t('core.editAddressForm.address')
  };

  const showArrowIcon = currentStepConfig.currentSection === AddressDetailsSteps.EDIT || popupView;
  const showForm =
    currentStepConfig.currentSection === AddressDetailsSteps.EDIT ||
    currentStepConfig.currentSection === AddressDetailsSteps.CREATE;
  const headerTitle = currentStepConfig?.headerTitle && t(currentStepConfig.headerTitle);
  const headerSubtitle = currentStepConfig?.headerSubtitle && t(currentStepConfig.headerSubtitle);

  return (
    <>
      <Drawer
        keyboard={false}
        className={cn(styles.drawer, { [styles.popupView]: popupView })}
        onClose={onCancelClick}
        title={<DrawerHeader title={headerTitle} subtitle={headerSubtitle} />}
        navigation={
          <DrawerNavigation
            title={t('browserView.addressBook.title')}
            onCloseIconClick={!popupView ? onCancelClick : undefined}
            onArrowIconClick={showArrowIcon ? onArrowIconClick : undefined}
          />
        }
        footer={
          <>
            {currentStepConfig.currentSection === AddressDetailsSteps.DETAILS && (
              <div className={styles.footer}>
                <Button
                  data-testid="address-form-details-btn-edit"
                  onClick={() => {
                    sendAnalytics(
                      popupView
                        ? AnalyticsEventNames.AddressBook.EDIT_ADDRESS_POPUP
                        : AnalyticsEventNames.AddressBook.EDIT_ADDRESS_BROWSER
                    );
                    setCurrentStepConfig(stepsConfiguration[currentStepConfig.nextSection]);
                  }}
                  size="large"
                  block
                >
                  {t('browserView.addressBook.addressDetail.btn.edit')}
                </Button>
                <Button
                  data-testid="address-form-details-btn-delete"
                  onClick={() => {
                    sendAnalytics(
                      popupView
                        ? AnalyticsEventNames.AddressBook.DELETE_ADDRESS_PROMPT_POPUP
                        : AnalyticsEventNames.AddressBook.DELETE_ADDRESS_PROMPT_BROWSER
                    );
                    setSelectedId(initialValues.id);
                  }}
                  color="secondary"
                  size="large"
                  className={styles.deleteButton}
                  block
                >
                  {t('browserView.addressBook.addressDetail.btn.delete')}
                </Button>
              </div>
            )}
            {showForm && (
              <EditAddressFormFooter
                validations={validations}
                formValues={formValues}
                onCancelClick={handleOnCancelClick}
                onConfirmClick={onConfirmClick}
                getFieldError={getFieldError}
                onClose={onCancelClick}
                isNewAddress={currentStepConfig.currentSection === AddressDetailsSteps.CREATE}
                currentName={initialValues?.name}
              />
            )}
          </>
        }
        visible={visible}
        popupView={popupView}
      >
        {visible && (
          <>
            {currentStepConfig.currentSection === AddressDetailsSteps.DETAILS && initialValues && (
              <div className={styles.container} data-testid="address-form-details-container">
                <div className={styles.body}>
                  <div
                    className={cn(styles.name, { [styles.extended]: !popupView })}
                    data-testid="address-form-details-name"
                  >
                    {initialValues.name}
                  </div>
                  <div className={styles.addressWrapper}>
                    <div
                      className={cn(styles.address, { [styles.extended]: !popupView })}
                      data-testid="address-form-details-address"
                    >
                      {initialValues.address}
                    </div>
                    <CopyToClipboard text={initialValues.address}>
                      <Button
                        data-testid="address-form-details-copy"
                        onClick={(e: React.MouseEvent<HTMLOrSVGElement>) => {
                          e.stopPropagation();
                          toast.notify({
                            text: t('general.clipboard.copiedToClipboard'),
                            withProgressBar: true
                          });
                        }}
                        color="secondary"
                        className={cn({ [styles.copyAddressButton]: popupView })}
                      >
                        <div>
                          <Icon component={Copy} className={styles.copyIcon} />
                          {t('addressBook.addressDetail.btn.copy')}
                        </div>
                      </Button>
                    </CopyToClipboard>
                  </div>
                </div>
              </div>
            )}
            {showForm && (
              <div className={styles.container} data-testid="address-form-container">
                <AddressForm
                  {...{
                    initialValues,
                    setFormValues,
                    getFieldError,
                    validations
                  }}
                  translations={editAddressFormTranslations}
                />
              </div>
            )}
          </>
        )}
      </Drawer>
      <DeleteAddressModal
        onCancel={() => {
          sendAnalytics(
            popupView
              ? AnalyticsEventNames.AddressBook.CANCEL_DELETE_ADDRESS_POPUP
              : AnalyticsEventNames.AddressBook.CANCEL_DELETE_ADDRESS_BROWSER
          );
          // eslint-disable-next-line unicorn/no-null
          setSelectedId(null);
        }}
        onConfirm={() => {
          sendAnalytics(
            popupView
              ? AnalyticsEventNames.AddressBook.CONFIRM_DELETE_ADDRESS_POPUP
              : AnalyticsEventNames.AddressBook.CONFIRM_DELETE_ADDRESS_BROWSER
          );
          onDelete(selectedId);
          // eslint-disable-next-line unicorn/no-null
          setSelectedId(null);
          onCancelClick();
        }}
        visible={!!selectedId}
        isSmall={popupView}
      />
    </>
  );
};
