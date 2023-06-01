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

const stepConfiguration: AddressDetailsConfig = {
  [AddressDetailsSteps.DETAILS]: {
    currentSection: AddressDetailsSteps.DETAILS,
    nextSection: AddressDetailsSteps.EDIT
  },
  [AddressDetailsSteps.EDIT]: {
    currentSection: AddressDetailsSteps.EDIT,
    prevSection: AddressDetailsSteps.DETAILS
  },
  [AddressDetailsSteps.CREATE]: {
    currentSection: AddressDetailsSteps.CREATE
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
  const [stepsConfig, setStepsConfig] = useState<AddressDetailsSectionConfig>(stepConfiguration[initialStep]);
  useEffect(() => {
    setStepsConfig(stepConfiguration[initialStep]);
  }, [initialStep]);
  const showArrowIcon = stepsConfig.currentSection === AddressDetailsSteps.EDIT || popupView;
  const [formValues, setFormValues] = useState<valuesPropType>(initialValues || {});
  const analytics = useAnalyticsContext();

  const editAddressFormTranslations = {
    walletName: t('core.addressForm.name'),
    address: t('core.editAddressForm.address')
  };

  useEffect(() => {
    setFormValues(initialValues);
  }, [initialValues]);

  const onArrowIconClick = () =>
    popupView && (!stepConfiguration[stepsConfig.prevSection] || !initialValues?.id)
      ? onCancelClick()
      : setStepsConfig(stepConfiguration[stepsConfig.prevSection]);

  useKeyboardShortcut(['Escape'], () => {
    if (selectedId) {
      // eslint-disable-next-line unicorn/no-null
      setSelectedId(null);
      return;
    }
    stepConfiguration[stepsConfig.prevSection] ? onArrowIconClick() : onCancelClick();
  });

  const getFieldError = (key: FormKeys) => validations[key]?.(formValues[key]);

  const handleOnCancelClick = () => {
    if (stepsConfig.currentSection === AddressDetailsSteps.CREATE) {
      onCancelClick();
    } else {
      setStepsConfig(stepConfiguration[AddressDetailsSteps.DETAILS]);
    }
  };

  const sendAnalytics = (name: string) => {
    analytics.sendEvent({
      category: AnalyticsEventCategories.ADDRESS_BOOK,
      action: AnalyticsEventActions.CLICK_EVENT,
      name
    });
  };

  const newAddressFormTitle = popupView
    ? t('browserView.addressBook.addressForm.title.add')
    : t('browserView.addressBook.form.addNewAddress');
  const drawerHeaderTitle =
    stepsConfig.currentSection === AddressDetailsSteps.DETAILS
      ? t('browserView.addressBook.addressDetail.title')
      : (stepsConfig.currentSection === AddressDetailsSteps.CREATE && newAddressFormTitle) ||
        t('browserView.addressBook.editAddress.title');

  const isFormStep =
    stepsConfig.currentSection === AddressDetailsSteps.EDIT ||
    stepsConfig.currentSection === AddressDetailsSteps.CREATE;

  return (
    <>
      <Drawer
        keyboard={false}
        className={cn(styles.drawer, { [styles.popupView]: popupView })}
        onClose={onCancelClick}
        title={
          <DrawerHeader
            title={drawerHeaderTitle}
            subtitle={
              stepsConfig.currentSection === AddressDetailsSteps.CREATE &&
              t('browserView.addressBook.form.addNewSubtitle')
            }
          />
        }
        navigation={
          <DrawerNavigation
            title={t('browserView.addressBook.title')}
            onCloseIconClick={!popupView ? onCancelClick : undefined}
            onArrowIconClick={showArrowIcon ? onArrowIconClick : undefined}
          />
        }
        footer={
          <>
            {stepsConfig.currentSection === AddressDetailsSteps.DETAILS && (
              <div className={styles.footer}>
                <Button
                  data-testid="address-form-details-btn-edit"
                  onClick={() => {
                    sendAnalytics(
                      popupView
                        ? AnalyticsEventNames.AddressBook.EDIT_ADDRESS_POPUP
                        : AnalyticsEventNames.AddressBook.EDIT_ADDRESS_BROWSER
                    );
                    setStepsConfig(stepConfiguration[stepsConfig.nextSection]);
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
            {isFormStep && (
              <EditAddressFormFooter
                validations={validations}
                formValues={formValues}
                onCancelClick={handleOnCancelClick}
                onConfirmClick={onConfirmClick}
                getFieldError={getFieldError}
                onClose={onCancelClick}
                isNewAddress={stepsConfig.currentSection === AddressDetailsSteps.CREATE}
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
            {stepsConfig.currentSection === AddressDetailsSteps.DETAILS && initialValues && (
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
            {isFormStep && (
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
