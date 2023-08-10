/* eslint-disable no-empty-pattern */
import React, { useState } from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button, Banner, Drawer, DrawerNavigation, DrawerHeader, Ellipsis, toast } from '@lace/common';
import styles from './AddressChangeDetailDrawer.module.scss';
import { Timeline, Typography } from 'antd';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Copy from '@assets/icons/copy.component.svg';
import Check from '@assets/icons/check-success.component.svg';
import {
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import { valuesPropType } from '@lace/core';
import { AddressActionsModal, ACTIONS } from '../AddressActionsModal';

type InitialValuesProps = {
  address?: string;
  id?: number;
  name?: string;
};

type AddressChangeDetailDrawerProps = {
  initialValues: InitialValuesProps;
  expectedAddress: string;
  actualAddress: string;
  visible: boolean;
  popupView?: boolean;
  onCancelClick?: (event?: React.MouseEvent<HTMLButtonElement>) => unknown;
  onConfirmClick: (values: valuesPropType) => unknown;
  onDelete: (address: InitialValuesProps['id']) => unknown;
};

const defaultBeforeEllipsis = 27;
const defaultAfterEllipsis = 7;

const { Text } = Typography;

export const AddressChangeDetailDrawer = ({
  initialValues,
  expectedAddress,
  actualAddress,
  onCancelClick,
  visible,
  popupView,
  onDelete,
  onConfirmClick
}: AddressChangeDetailDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  const [selectedId, setSelectedSelectedId] = useState<number | null>();
  const [action, setAction] = useState<typeof ACTIONS.UPDATE | typeof ACTIONS.DELETE | null>();
  const [actualAddressHasBeenCopied, setActualAddressHasBeenCopied] = useState(false);
  const [expectedAddressHasBeenCopied, setExpectedAddressHasBeenCopied] = useState(false);
  const analytics = useAnalyticsContext();

  const handleExpectedAddressOnClickCopy = () => {
    toast.notify({
      text: t('general.clipboard.copiedToClipboard'),
      withProgressBar: true
    });
    setExpectedAddressHasBeenCopied(true);
  };
  const handleActualAddressOnClickCopy = () => {
    toast.notify({
      text: t('general.clipboard.copiedToClipboard'),
      withProgressBar: true
    });
    setActualAddressHasBeenCopied(true);
  };
  const handleMouseLeaveExpectedAddress = () => {
    setExpectedAddressHasBeenCopied(false);
  };
  const handleMouseLeaveActualAddress = () => {
    setActualAddressHasBeenCopied(false);
  };

  const expectedAddressCopyText = expectedAddressHasBeenCopied ? 'general.button.copied' : 'general.button.copy';
  const actualAddressCopyText = actualAddressHasBeenCopied ? 'general.button.copied' : 'general.button.copy';

  const sendAnalytics = (analyticsName: string) => {
    analytics.sendEventToMatomo({
      category: MatomoEventCategories.ADDRESS_BOOK,
      action: MatomoEventActions.CLICK_EVENT,
      name: analyticsName
    });
  };

  const onHandleCancel = () => {
    // eslint-disable-next-line unicorn/no-null
    setSelectedSelectedId(null);
    if (action === 'delete') {
      sendAnalytics(
        popupView
          ? AnalyticsEventNames.AddressBook.CANCEL_DELETE_ADDRESS_POPUP
          : AnalyticsEventNames.AddressBook.CANCEL_DELETE_ADDRESS_BROWSER
      );
    } else {
      sendAnalytics(
        popupView
          ? AnalyticsEventNames.AddressBook.CANCEL_UPDATE_ADDRESS_POPUP
          : AnalyticsEventNames.AddressBook.CANCEL_UPDATE_ADDRESS_BROWSER
      );
    }
  };

  const onHandleConfirm = () => {
    // eslint-disable-next-line unicorn/no-null
    setSelectedSelectedId(null);
    if (action === 'delete') {
      sendAnalytics(
        popupView
          ? AnalyticsEventNames.AddressBook.CONFIRM_DELETE_UPDATE_ADDRESS_POPUP
          : AnalyticsEventNames.AddressBook.CONFIRM_DELETE_UPDATE_ADDRESS_BROWSER
      );
      onDelete(selectedId);
      onCancelClick();
    } else {
      sendAnalytics(
        popupView
          ? AnalyticsEventNames.AddressBook.CONFIRM_UPDATE_ADDRESS_POPUP
          : AnalyticsEventNames.AddressBook.CONFIRM_UPDATE_ADDRESS_BROWSER
      );
      onConfirmClick(initialValues);
      onCancelClick();
    }
  };

  return (
    <>
      <Drawer
        zIndex={999}
        onClose={onCancelClick}
        className={cn(styles.drawer, { [styles.popupView]: popupView })}
        title={<DrawerHeader title={t('addressBook.reviewModal.title', { name: initialValues.name })} />}
        open={visible}
        navigation={
          <DrawerNavigation
            onCloseIconClick={!popupView ? onCancelClick : undefined}
            onArrowIconClick={popupView ? onCancelClick : undefined}
          />
        }
        footer={
          <div className={styles.footer}>
            <Button
              data-testid="address-form-details-btn-update"
              onClick={() => {
                sendAnalytics(
                  popupView
                    ? AnalyticsEventNames.AddressBook.UPDATE_ADDRESS_POPUP
                    : AnalyticsEventNames.AddressBook.UPDATE_ADDRESS_BROWSER
                );
                setSelectedSelectedId(initialValues.id);
                setAction(ACTIONS.UPDATE);
              }}
              size="large"
              block
            >
              {t('addressBook.reviewModal.confirmUpdate.button')}
            </Button>
            <Button
              data-testid="address-form-details-btn-delete"
              onClick={() => {
                sendAnalytics(
                  popupView
                    ? AnalyticsEventNames.AddressBook.DELETE_UPDATE_ADDRESS_PROMPT_POPUP
                    : AnalyticsEventNames.AddressBook.DELETE_UPDATE_ADDRESS_PROMPT_BROWSER
                );
                setSelectedSelectedId(initialValues.id);
                setAction(ACTIONS.DELETE);
              }}
              color="secondary"
              size="large"
              className={styles.deleteButton}
              block
            >
              {t('addressBook.reviewModal.cancelUpdate.button')}
            </Button>
          </div>
        }
        popupView={popupView}
      >
        <>
          <div className={styles.warningBanner}>
            <Banner
              withIcon
              message={t('addressBook.reviewModal.banner.browserDescription', { name: initialValues.name })}
            />
          </div>
          <div className={styles.addressContainer}>
            <Timeline className={cn(styles.sideTimeline)}>
              <Timeline.Item dot={<div className={styles.inactiveDot} />}>
                <div className={cn(styles.addressDetailsContainer)}>
                  <div className={cn(styles.addressDataDetails)}>
                    <div className={cn(styles.activeText)}>
                      {t('addressBook.reviewModal.previousAddress.description')}
                    </div>
                    <Ellipsis
                      text={expectedAddress}
                      className={cn(styles.addressDetails)}
                      withTooltip={false}
                      {...(popupView
                        ? {
                            beforeEllipsis: defaultBeforeEllipsis,
                            afterEllipsis: defaultAfterEllipsis
                          }
                        : { ellipsisInTheMiddle: true })}
                    />
                  </div>
                  <CopyToClipboard text={expectedAddress}>
                    <div onMouseLeave={handleMouseLeaveExpectedAddress}>
                      <div
                        onClick={handleExpectedAddressOnClickCopy}
                        className={styles.copyContainer}
                        data-testid="transaction-hash-copy-container"
                      >
                        {expectedAddressHasBeenCopied ? (
                          <Check className={styles.checkIcon} />
                        ) : (
                          <Copy className={styles.copyIcon} />
                        )}
                        <Text className={styles.copy} data-testid="transaction-hash-copy-text">
                          {t(expectedAddressCopyText)}
                        </Text>
                      </div>
                    </div>
                  </CopyToClipboard>
                </div>
              </Timeline.Item>

              <Timeline.Item dot={<div className={styles.activeDot} />}>
                <div className={cn(styles.addressDetailsContainer)}>
                  <div className={cn(styles.addressDataDetails)}>
                    <div className={cn(styles.activeText)}>
                      {' '}
                      {t('addressBook.reviewModal.actualAddress.description')}
                    </div>
                    <Ellipsis
                      text={actualAddress}
                      className={cn(styles.addressDetails)}
                      withTooltip={false}
                      {...(popupView
                        ? {
                            beforeEllipsis: defaultBeforeEllipsis,
                            afterEllipsis: defaultAfterEllipsis
                          }
                        : { ellipsisInTheMiddle: true })}
                    />
                  </div>
                  <CopyToClipboard text={actualAddress}>
                    <div onMouseLeave={handleMouseLeaveActualAddress}>
                      <div
                        className={styles.copyContainer}
                        onClick={handleActualAddressOnClickCopy}
                        data-testid="transaction-hash-copy-container"
                      >
                        {actualAddressHasBeenCopied ? (
                          <Check className={styles.checkIcon} />
                        ) : (
                          <Copy className={styles.copyIcon} />
                        )}
                        <Text className={styles.copy} data-testid="transaction-hash-copy-text">
                          {t(actualAddressCopyText)}
                        </Text>
                      </div>
                    </div>
                  </CopyToClipboard>
                </div>
              </Timeline.Item>
            </Timeline>
          </div>
        </>
      </Drawer>
      <AddressActionsModal
        action={action}
        onCancel={onHandleCancel}
        onConfirm={onHandleConfirm}
        visible={!!selectedId}
        isPopup={popupView}
      />
    </>
  );
};
