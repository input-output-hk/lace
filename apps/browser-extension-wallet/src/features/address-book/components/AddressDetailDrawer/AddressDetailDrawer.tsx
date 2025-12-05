/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable complexity */
import React, { useEffect, useMemo, useState } from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Button, toast, Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { EditAddressForm, EditAddressFormFooter, valuesPropType } from '@lace/core';
import { validateWalletName, validateWalletAddress, validateWalletHandle } from '@src/utils/validators/address-book';
import { AddressDetailsSteps, AddressDetailsConfig, AddressDetailsSectionConfig } from './types';
import { AddressActionsModal, ACTIONS } from '../AddressActionsModal';
import styles from './AddressDetailDrawer.module.scss';
import Copy from '@src/assets/icons/copy.component.svg';
import Icon from '@ant-design/icons';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useHandleResolver } from '@hooks/useHandleResolver';
import { Form } from 'antd';

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
    headerTitle: 'browserView.addressBook.form.addNewAddress'
  }
};

type InitialValuesProps = {
  address?: string;
  id?: number;
  name?: string;
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
  const [form] = Form.useForm<{ name: string; address: string }>();

  const handleResolver = useHandleResolver();

  const validations = useMemo(
    () => ({
      name: validateWalletName,
      address: validateWalletAddress,
      handle: async (value: string) => await validateWalletHandle({ value, handleResolver })
    }),
    [handleResolver]
  );

  const analytics = useAnalyticsContext();

  useEffect(() => {
    if (!visible) {
      return;
    }
    setCurrentStepConfig(stepsConfiguration[initialStep]);
  }, [initialStep, visible]);

  const onArrowIconClick = () =>
    popupView && (!stepsConfiguration[currentStepConfig.prevSection] || !initialValues?.id)
      ? onCancelClick()
      : setCurrentStepConfig(stepsConfiguration[currentStepConfig.prevSection]);

  const handleOnCancelClick = () => {
    if (currentStepConfig.currentSection === AddressDetailsSteps.CREATE) {
      analytics.sendEventToPostHog(PostHogAction.AddressBookAddNewAddressCancelClick);
      onCancelClick();
    } else {
      analytics.sendEventToPostHog(PostHogAction.AddressBookAddressRecordEditAddressCancelClick);
      setCurrentStepConfig(stepsConfiguration[AddressDetailsSteps.DETAILS]);
    }
  };

  const handleOnCloseIconClick = () => {
    if (currentStepConfig.currentSection === AddressDetailsSteps.EDIT) {
      analytics.sendEventToPostHog(PostHogAction.AddressBookAddressRecordEditAddressXClick);
    }
    onCancelClick();
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

  return (
    <>
      <Drawer
        zIndex={999}
        className={cn(styles.drawer, { [styles.popupView]: popupView })}
        onClose={onCancelClick}
        title={<DrawerHeader title={headerTitle} />}
        navigation={
          <DrawerNavigation
            title={t('browserView.addressBook.title')}
            onCloseIconClick={!popupView ? handleOnCloseIconClick : undefined}
            onArrowIconClick={showArrowIcon ? onArrowIconClick : undefined}
          />
        }
        footer={
          <>
            {showForm && (
              <EditAddressFormFooter
                form={form}
                isNewAddress={currentStepConfig.currentSection === AddressDetailsSteps.CREATE}
                onConfirmClick={onConfirmClick}
                onCancelClick={handleOnCancelClick}
                onClose={onCancelClick}
              />
            )}
            {currentStepConfig.currentSection === AddressDetailsSteps.DETAILS && (
              <div className={styles.footer}>
                <Button
                  data-testid="address-form-details-btn-edit"
                  onClick={() => {
                    analytics.sendEventToPostHog(PostHogAction.AddressBookAddressRecordEditClick);
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
                    analytics.sendEventToPostHog(PostHogAction.AddressBookAddressRecordDeleteClick);
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
                          analytics.sendEventToPostHog(PostHogAction.AddressBookAddressRecordCopyClick);
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
                <EditAddressForm
                  form={form}
                  {...{
                    initialValues,
                    validations
                  }}
                  translations={editAddressFormTranslations}
                />
              </div>
            )}
          </>
        )}
      </Drawer>
      <AddressActionsModal
        action={ACTIONS.DELETE}
        onCancel={() => {
          analytics.sendEventToPostHog(PostHogAction.AddressBookAddressRecordHoldUpCancelClick);
          // eslint-disable-next-line unicorn/no-null
          setSelectedId(null);
        }}
        onConfirm={() => {
          analytics.sendEventToPostHog(PostHogAction.AddressBookAddressRecordHoldUpDeleteAddressClick);
          onDelete(selectedId);
          // eslint-disable-next-line unicorn/no-null
          setSelectedId(null);
          onCancelClick();
        }}
        visible={!!selectedId}
        isPopup={popupView}
      />
    </>
  );
};
