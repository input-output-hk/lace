/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Box, Button, Flex } from '@input-output-hk/lace-ui-toolkit';
import cn from 'classnames';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import bgPopup from '@assets/images/register-drep-bg-popup.png';
import BG from '@assets/images/register-drep-bg.png';
import styles from './VotingCenterBanner.module.scss';

type props = {
  popupView?: boolean;
  openExternalLink: (url: string) => void;
  govToolUrl: string;
};

export const VotingCenterBanner = ({ popupView, openExternalLink, govToolUrl }: props): React.ReactElement => {
  const { t } = useTranslation();
  const btnWidth = popupView ? '$fill' : '$auto';

  return (
    <div className={cn(styles.container, { [styles.popupView!]: popupView })} data-testid="register-as-drep-banner">
      <img className={styles.bg} src={popupView ? bgPopup : BG} />
      <Flex flexDirection="column" justifyContent="center" className={styles.content}>
        <div className={styles.title} data-testid="register-as-drep-banner-title">
          {t('browserView.voting-beta.modal.title')}
        </div>
        <div className={styles.description} data-testid="register-as-drep-banner-description">
          {!popupView ? (
            t('browserView.voting-beta.modal.description')
          ) : (
            <Trans
              components={{
                br: <br />
              }}
              i18nKey="browserView.voting-beta.modal.description-popup"
            />
          )}
        </div>
        <Box w={btnWidth} mt="$20" h="$48">
          <Button.CallToAction
            w={btnWidth}
            onClick={() => openExternalLink(govToolUrl)}
            data-testid="register-now-at-gov-tool-button"
            label={t('browserView.voting-beta.modal.cta')}
          />
        </Box>
      </Flex>
    </div>
  );
};
