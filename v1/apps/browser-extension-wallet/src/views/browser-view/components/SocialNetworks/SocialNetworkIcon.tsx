import React from 'react';
import Icon from '@ant-design/icons';
import { useExternalLinkOpener } from '@providers/ExternalLinkOpenerProvider';
import styles from './SocialNetworkIcon.module.scss';
import Facebook from '../../../../assets/icons/facebook-icon.component.svg';
import Site from '../../../../assets/icons/site-icon.component.svg';
import Feed from '../../../../assets/icons/feed-icon.component.svg';
import Telegram from '../../../../assets/icons/telegram-icon.component.svg';
import GitHub from '../../../../assets/icons/github-icon.component.svg';
import Twitter from '../../../../assets/icons/twitter-icon.component.svg';
import Youtube from '../../../../assets/icons/youtube-icon.component.svg';
import Discord from '../../../../assets/icons/discord-logo.component.svg';

const normalizeHref = (href: string) =>
  href && !href.startsWith('https://') ? `https://${href.replace(/^\/+/, '')}` : href;

export enum SocialNetwork {
  RSS_FEED,
  WEBSITE,
  FACEBOOK,
  TELEGRAM,
  GITHUB,
  TWITTER,
  YOUTUBE,
  DISCORD
}

export const iconsMap: Record<SocialNetwork, React.FC<React.SVGProps<SVGSVGElement>>> = {
  [SocialNetwork.RSS_FEED]: Feed,
  [SocialNetwork.WEBSITE]: Site,
  [SocialNetwork.FACEBOOK]: Facebook,
  [SocialNetwork.TELEGRAM]: Telegram,
  [SocialNetwork.GITHUB]: GitHub,
  [SocialNetwork.TWITTER]: Twitter,
  [SocialNetwork.YOUTUBE]: Youtube,
  [SocialNetwork.DISCORD]: Discord
};

export type socialNetworkIconProps = {
  key: number | string;
  href: string;
  name: SocialNetwork;
  className?: string;
  'data-testid'?: string;
};

export const SocialNetworkIcon = ({ name, href }: socialNetworkIconProps): React.ReactElement => {
  const socialIcon = iconsMap[name];
  const openExternalLink = useExternalLinkOpener();

  return (
    Icon && (
      <div
        onClick={() => openExternalLink(normalizeHref(href))}
        className={styles.item}
        data-testid={`${SocialNetwork[name]}-container`}
      >
        <Icon
          component={socialIcon}
          alt={SocialNetwork[name]}
          className={styles.icon}
          data-testid={`${SocialNetwork[name]}-icon`}
        />
      </div>
    )
  );
};
