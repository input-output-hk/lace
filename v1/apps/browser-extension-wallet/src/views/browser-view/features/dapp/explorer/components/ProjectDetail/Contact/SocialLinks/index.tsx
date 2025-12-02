import * as React from 'react';
import { SocialIcon } from './SocialIcon';
import { Tooltip } from 'antd';
import './styles.scss';

export interface ISocialLink {
  socialLinkId: string;
  socialLinkUrl: string;
}

export interface ISocialLinkProps {
  links: ISocialLink[];
}

export const SocialLinks: React.FC<ISocialLinkProps> = ({ links }) => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const handleOpenUrl = (url: string) => {
    window.open(url, 'blank');
  };

  return (
    <div className="iog-social-links">
      {links.map((link: ISocialLink) => (
        // TODO: FIX title below (use of socialLinkId) when api is clarified
        <Tooltip key={link.socialLinkId} placement="top" title={`${'side_panel.access'} ${link.socialLinkId}`}>
          <span className="iog-social-link" onClick={() => handleOpenUrl(link.socialLinkUrl)}>
            <SocialIcon iconId={link.socialLinkId} />
          </span>
        </Tooltip>
      ))}
    </div>
  );
};
