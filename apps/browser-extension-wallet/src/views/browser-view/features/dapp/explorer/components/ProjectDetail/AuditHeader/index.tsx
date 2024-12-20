import * as React from 'react';
import { IogImage } from '../../Image';
import { IogRow, IogBox } from '../../Grid';
import { IogTitle, IogText } from '../../Typography';

import './styles.scss';

interface IAuditHeaderProps {
  title: string;
  subtitle: string;
  image: {
    src?: string;
    alt?: string;
  };
  className?: string;
  style?: React.CSSProperties;
}

export const AuditHeader = ({ title, subtitle, image }: IAuditHeaderProps) => (
  <IogRow className="iog-audit-header">
    <IogBox>
      <IogTitle as="h3" smallest>
        {title}
      </IogTitle>
      {image?.src && <IogImage src={image.src} alt={image.alt} />}
    </IogBox>
    <IogBox spacer={12}>
      <IogText as="h3" xMedium>
        {subtitle}
      </IogText>
    </IogBox>
  </IogRow>
);
