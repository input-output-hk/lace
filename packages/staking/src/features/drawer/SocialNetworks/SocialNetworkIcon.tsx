import Icon from '@ant-design/icons';
import React from 'react';
import { ReactComponent as Facebook } from './facebook-icon.component.svg';
import { ReactComponent as Feed } from './feed-icon.component.svg';
import { ReactComponent as GitHub } from './github-icon.component.svg';
import { ReactComponent as Medium } from './medium-icon.component.svg';
import { ReactComponent as Site } from './site-icon.component.svg';
import styles from './SocialNetworkIcon.module.scss';
import { ReactComponent as Telegram } from './telegram-icon.component.svg';
import { ReactComponent as Twitter } from './twitter-icon.component.svg';
import { ReactComponent as Youtube } from './youtube-icon.component.svg';

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
  MEDIUM,
}

export const iconsMap: Record<SocialNetwork, React.FC<React.SVGProps<SVGSVGElement>>> = {
  [SocialNetwork.RSS_FEED]: Feed,
  [SocialNetwork.WEBSITE]: Site,
  [SocialNetwork.FACEBOOK]: Facebook,
  [SocialNetwork.TELEGRAM]: Telegram,
  [SocialNetwork.GITHUB]: GitHub,
  [SocialNetwork.TWITTER]: Twitter,
  [SocialNetwork.YOUTUBE]: Youtube,
  [SocialNetwork.MEDIUM]: Medium,
};

export type SocialNetworkIconProps = {
  name: SocialNetwork;
  href: string;
  onClick: (normalizedHref: string) => void;
};

export const SocialNetworkIcon = ({ name, href, onClick }: SocialNetworkIconProps): React.ReactElement => {
  const socialIcon = iconsMap[name];

  return socialIcon ? (
    <div
      onClick={() => onClick(normalizeHref(href))}
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
  ) : (
    <></>
  );
};
