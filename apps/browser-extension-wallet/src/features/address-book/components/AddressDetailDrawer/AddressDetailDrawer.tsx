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

const config: AddressDetailsConfig = {
  [AddressDetailsSteps.DETAIL]: {
    currentSection: AddressDetailsSteps.DETAIL,
    nextSection: AddressDetailsSteps.FORM
  },
  [AddressDetailsSteps.FORM]: {
    currentSection: AddressDetailsSteps.FORM,
    prevSection: AddressDetailsSteps.DETAIL
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
  initialValues: InitialValuesProps;
  onCancelClick: (event?: React.MouseEvent<HTMLButtonElement>) => unknown;
  onConfirmClick: (values: valuesPropType) => unknown;
  onDelete: (address: InitialValuesProps['id']) => unknown;
  visible: boolean;
  useNewAddressForm?: boolean;
  popupView?: boolean;
};

export const AddressDetailDrawer = ({
  initialValues,
  onCancelClick,
  onConfirmClick,
  visible,
  onDelete,
  popupView,
  useNewAddressForm
}: AddressDetailDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<number | null>();
  const [stepsConfig, setStepsConfig] = useState<AddressDetailsSectionConfig>(
    useNewAddressForm
      ? config[AddressDetailsSteps.FORM]
      : config[initialValues?.id ? AddressDetailsSteps.DETAIL : AddressDetailsSteps.FORM]
  );
  useEffect(() => {
    setStepsConfig(
      useNewAddressForm
        ? config[AddressDetailsSteps.FORM]
        : config[initialValues?.id ? AddressDetailsSteps.DETAIL : AddressDetailsSteps.FORM]
    );
  }, [initialValues?.id, useNewAddressForm]);
  const showArrowIcon = (stepsConfig.currentSection === AddressDetailsSteps.FORM && !useNewAddressForm) || popupView;
  const [formValues, setFormValues] = useState<valuesPropType>(initialValues || {});
  const analytics = useAnalyticsContext();

  const editAddressFormTranslations = {
    walletName: t('core.addressForm.name'),
    address: t('core.editAddressForm.address')
  };

  const onClose = () => {
    if (!popupView) {
      setStepsConfig(config[AddressDetailsSteps.DETAIL]);
      onCancelClick();
    } else {
      onCancelClick();
    }
  };

  const onArrowIconClick = () =>
    popupView && (!config[stepsConfig.prevSection] || !initialValues?.id)
      ? onCancelClick()
      : setStepsConfig(config[stepsConfig.prevSection]);

  useKeyboardShortcut(['Escape'], () => {
    if (selectedId) {
      // eslint-disable-next-line unicorn/no-null
      setSelectedId(null);
      return;
    }
    config[stepsConfig.prevSection] ? onArrowIconClick() : onClose();
  });

  const getFieldError = (key: FormKeys) => validations[key]?.(formValues[key]);

  const handleOnCancelClick = () => {
    if ((popupView && initialValues?.id) || useNewAddressForm) {
      onCancelClick();
    } else {
      setStepsConfig(config[AddressDetailsSteps.DETAIL]);
    }
  };

  const sendAnalytics = (name: string) => {
    analytics.sendEvent({
      category: AnalyticsEventCategories.ADDRESS_BOOK,
      action: AnalyticsEventActions.CLICK_EVENT,
      name
    });
  };

  const isNewAddressFormPopup = popupView && !initialValues?.id;
  const newAddressFormTitle = useNewAddressForm
    ? t('browserView.addressBook.form.addNewAddress')
    : t('browserView.addressBook.addressForm.title.add');
  const drawerHeaderTitle =
    stepsConfig.currentSection === AddressDetailsSteps.DETAIL
      ? t('browserView.addressBook.addressDetail.title')
      : ((isNewAddressFormPopup || useNewAddressForm) && newAddressFormTitle) ||
        t('browserView.addressBook.editAddress.title');

  return (
    <>
      <Drawer
        keyboard={false}
        className={cn(styles.drawer, { [styles.popupView]: popupView })}
        onClose={onClose}
        title={
          <DrawerHeader
            title={drawerHeaderTitle}
            subtitle={useNewAddressForm && t('browserView.addressBook.form.addNewSubtitle')}
          />
        }
        navigation={
          <DrawerNavigation
            title={t('browserView.addressBook.title')}
            onCloseIconClick={!popupView ? onClose : undefined}
            onArrowIconClick={showArrowIcon ? onArrowIconClick : undefined}
          />
        }
        footer={
          <>
            {stepsConfig.currentSection === AddressDetailsSteps.DETAIL && (
              <div className={styles.footer}>
                <Button
                  data-testid="address-form-details-btn-edit"
                  onClick={() => {
                    sendAnalytics(
                      popupView
                        ? AnalyticsEventNames.AddressBook.EDIT_ADDRESS_POPUP
                        : AnalyticsEventNames.AddressBook.EDIT_ADDRESS_BROWSER
                    );
                    setStepsConfig(config[stepsConfig.nextSection]);
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
            {stepsConfig.currentSection === AddressDetailsSteps.FORM && (
              <EditAddressFormFooter
                validations={validations}
                formValues={formValues}
                onCancelClick={handleOnCancelClick}
                onConfirmClick={onConfirmClick}
                getFieldError={getFieldError}
                onClose={onClose}
                isNewAddress={isNewAddressFormPopup || useNewAddressForm}
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
            {stepsConfig.currentSection === AddressDetailsSteps.DETAIL && initialValues && (
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
            {stepsConfig.currentSection === AddressDetailsSteps.FORM && (
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
