import * as React from 'react';
import { EIconsName, Icon } from '../../../../components/Icon';

// eslint-disable-next-line complexity
export const SocialIcon: React.FC<{ iconId: string }> = (data) => {
  const iconFun = (icon: EIconsName) => <Icon name={icon} size={24} strokeColor="#6F7786" />;

  switch (data.iconId) {
    case 'facebook':
      return iconFun(EIconsName.FACEBOOK);
    case 'twitter':
      return iconFun(EIconsName.TWITTER);
    case 'discord':
      return iconFun(EIconsName.DISCORD);
    case 'github':
      return iconFun(EIconsName.GITHUB);
    case 'telegram':
      return iconFun(EIconsName.TELEGRAM);
    case 'linktree':
      return iconFun(EIconsName.LINKTREE);
    case 'whitepaper':
      return iconFun(EIconsName.WHITEPAPER);
    case 'instagram':
      return iconFun(EIconsName.INSTAGRAM);
    case 'threads':
      return iconFun(EIconsName.THREADS);
    case 'medium':
      return iconFun(EIconsName.MEDIUM);
    case 'reddit':
      return iconFun(EIconsName.REDDIT);
    default:
      return <></>;
  }
};
