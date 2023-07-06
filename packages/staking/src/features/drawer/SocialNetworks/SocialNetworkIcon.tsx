import Icon from '@ant-design/icons';
import React from 'react';
import Facebook from './facebook.svg';
import Feed from './feed.svg';
import GitHub from './github.svg';
import Medium from './medium.svg';
import Site from './site.svg';
import styles from './SocialNetworkIcon.module.scss';
import Telegram from './telegram.svg';
import Twitter from './twitter.svg';
import Youtube from './youtube.svg';

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
