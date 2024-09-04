import React from 'react';
import { Text } from '@input-output-hk/lace-ui-toolkit';
import { Button, TextArea, toast, PostHogAction } from '@lace/common';
import { useTranslation } from 'react-i18next';
import CopyToClipboard from 'react-copy-to-clipboard';
import { useAnalyticsContext } from '@providers';
import styles from './SignMessageDrawer.module.scss';

export const SignMessageResult: React.FC<{ signature: string }> = ({ signature }) => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  return (
    <>
      <Text.Body.Large weight="$bold">{t('core.signMessage.successTitle')}</Text.Body.Large>
      <Text.Body.Small className={styles.subtitle}>{t('core.signMessage.successDescription')}</Text.Body.Small>
      <div className={styles.inputGroup}>
        <Text.Body.Normal weight="$medium">{t('core.signMessage.signatureLabel')}</Text.Body.Normal>
        <TextArea value={signature} rows={4} className={styles.customTextArea} />
      </div>
      <CopyToClipboard text={signature}>
        <Button
          onClick={(e: React.MouseEvent<HTMLOrSVGElement>) => {
            e.stopPropagation();
            toast.notify({
              text: t('general.clipboard.copiedToClipboard'),
              withProgressBar: true
            });
            analytics.sendEventToPostHog(PostHogAction.SignMessageCopySignatureClick);
          }}
          className={styles.buttonContainer}
        >
          {t('core.signMessage.copyToClipboard')}
        </Button>
      </CopyToClipboard>
    </>
  );
};
