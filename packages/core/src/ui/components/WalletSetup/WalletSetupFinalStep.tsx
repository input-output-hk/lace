import React, { useEffect } from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import { SocialLink } from './SocialLink';
import styles from './WalletSetupFinalStep.module.scss';
import { ReactComponent as TwitterLogo } from '../../assets/icons/twitter-logo.component.svg';
import { ReactComponent as YoutubeLogo } from '../../assets/icons/youtube-logo.component.svg';
import { ReactComponent as DiscordLogo } from '../../assets/icons/discord-logo.component.svg';
import { TranslationsFor } from '@ui/utils/types';

type TranslationKeys = 'title' | 'description' | 'close' | 'followTwitter' | 'followYoutube' | 'followDiscord';
export interface WalletSetupFinalStepProps {
  onFinish: () => void;
  onRender?: () => void;
  translations: TranslationsFor<TranslationKeys>;
  isHardwareWallet?: boolean;
}

const TWITTER = 'Twitter';
const YOUTUBE = 'Youtube';
const DISCORD = 'Discord';

const iconsMap: { [key: string]: React.ReactNode } = {
  [TWITTER]: <TwitterLogo />,
  [YOUTUBE]: <YoutubeLogo />,
  [DISCORD]: <DiscordLogo />
};

if (!process.env.TWITTER_URL || !process.env.YOUTUBE_URL || !process.env.DISCORD_URL) {
  throw new Error('social links not provided');
}

const links: { url: string; name: keyof typeof iconsMap }[] = [
  { url: process.env.TWITTER_URL, name: TWITTER },
  { url: process.env.YOUTUBE_URL, name: YOUTUBE },
  { url: process.env.DISCORD_URL, name: DISCORD }
];

export const WalletSetupFinalStep = ({
  onFinish,
  onRender,
  translations,
  isHardwareWallet = false
}: WalletSetupFinalStepProps): React.ReactElement => {
  useEffect(() => {
    onRender && onRender();
  }, [onRender]);

  return (
    <WalletSetupStepLayout
      title={translations.title}
      description={translations.description}
      onNext={onFinish}
      nextLabel={translations.close}
      currentTimelineStep={WalletTimelineSteps.ALL_DONE}
      isHardwareWallet={isHardwareWallet}
    >
      <div className={styles.walletSetupFinalStep}>
        {links.map(({ name, url }) => (
          <SocialLink
            key={name}
            to={url}
            icon={iconsMap[name]}
            text={translations[`follow${name}` as TranslationKeys]}
            testId={(name as string).toLowerCase()}
          />
        ))}
      </div>
    </WalletSetupStepLayout>
  );
};
