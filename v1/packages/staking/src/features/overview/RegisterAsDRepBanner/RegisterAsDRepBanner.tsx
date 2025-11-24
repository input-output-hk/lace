/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Box, Button, Flex } from '@input-output-hk/lace-ui-toolkit';
import cn from 'classnames';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';

import bgPopup from '../../../assets/images/register-drep-bg-popup.png';
import BG from '../../../assets/images/register-drep-bg.png';
import styles from './RegisterAsDRepBanner.module.scss';

type props = {
  popupView?: boolean;
  openExternalLink: (url: string) => void;
  votingCenterUrl?: string;
};

export const RegisterAsDRepBanner = ({ popupView, openExternalLink, votingCenterUrl }: props): React.ReactElement => {
  const { t } = useTranslation();
  const { push } = useHistory();
  return (
    <div className={cn(styles.container, { [styles.popupView!]: popupView })} data-testid="register-as-drep-banner">
      <img className={styles.bg} src={popupView ? bgPopup : BG} />
      <Flex flexDirection="column" justifyContent="center" className={styles.content}>
        <div className={styles.title} data-testid="register-as-drep-banner-title">
          {t('browserView.staking.stakingInfo.RegisterAsDRepBanner.title')}
        </div>
        <div className={styles.description} data-testid="register-as-drep-banner-description">
          <Trans
            components={{
              a: (
                <a
                  className={styles.legalButton}
                  onClick={() => openExternalLink(`${process.env.FAQ_URL}?question=what-is-the-voltaire-govtool`)}
                  data-testid="know-more-link"
                />
              ),
            }}
            i18nKey="browserView.staking.stakingInfo.RegisterAsDRepBanner.description"
          />
        </div>
        <Box mt="$20" h="$48">
          <Button.CallToAction
            w="$auto"
            onClick={() => votingCenterUrl && push(votingCenterUrl)}
            data-testid="register-now-button"
            label={t('browserView.staking.stakingInfo.RegisterAsDRepBanner.cta')}
          />
        </Box>
      </Flex>
    </div>
  );
};
