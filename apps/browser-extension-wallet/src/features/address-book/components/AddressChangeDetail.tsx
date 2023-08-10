import React, { useState } from 'react';
import { Timeline, Typography } from 'antd';
import { Banner, Ellipsis, toast } from '@lace/common';
import cn from 'classnames';
import CopyToClipboard from 'react-copy-to-clipboard';
import { useTranslation } from 'react-i18next';
import Copy from '@assets/icons/copy.component.svg';
import Check from '@assets/icons/check-success.component.svg';
import styles from './AddressChangeDetail.module.scss';
import { withAddressBookContext } from '../context';

const { Text } = Typography;

const defaultBeforeEllipsis = 27;
const defaultAfterEllipsis = 7;

type AddressChangeDetailProps = {
  name: string;
  expectedAddress: string;
  actualAddress: string;
  isPopupView?: boolean;
};

export const AddressChangeDetail = withAddressBookContext(
  ({ isPopupView, name, expectedAddress, actualAddress }: AddressChangeDetailProps): React.ReactElement => {
    const { t } = useTranslation();
    const [actualAddressHasBeenCopied, setActualAddressHasBeenCopied] = useState(false);
    const [expectedAddressHasBeenCopied, setExpectedAddressHasBeenCopied] = useState(false);

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

    return (
      <>
        <div className={styles.warningBanner}>
          <Banner withIcon message={t('addressBook.reviewModal.banner.browserDescription', { name })} />
        </div>
        <div className={styles.addressContainer}>
          <Timeline className={cn(styles.sideTimeline)}>
            <Timeline.Item dot={<div className={styles.inactiveDot} />}>
              <div className={cn(styles.addressDetailsContainer)}>
                <div className={cn(styles.addressDataDetails)}>
                  <div className={cn(styles.activeText)}>
                    {t('addressBook.reviewModal.previewsAddress.description')}
                  </div>
                  <Ellipsis
                    text={expectedAddress}
                    className={cn(styles.addressDetails)}
                    withTooltip={false}
                    {...(isPopupView
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
                  <div className={cn(styles.activeText)}> {t('addressBook.reviewModal.actualAddress.description')}</div>
                  <Ellipsis
                    text={actualAddress}
                    className={cn(styles.addressDetails)}
                    withTooltip={false}
                    {...(isPopupView
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
    );
  }
);
