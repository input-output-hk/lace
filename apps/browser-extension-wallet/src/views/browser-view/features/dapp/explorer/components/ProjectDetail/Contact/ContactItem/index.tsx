import * as React from 'react';
import { IIcon } from '../../../../components/Icon/types';

interface ContactItemType {
  itemIcon: React.ReactElement<IIcon>;
  itemTitle: string;
  itemData: string;
}

export const ContactItem: React.FC<ContactItemType> = ({ itemIcon, itemTitle, itemData }) => (
  <div className="iog-contact-item" data-testid="contact-item">
    <span className="iog-contact-item-icon" data-testid="contact-icon">
      {itemIcon}
    </span>
    <span className="iog-contact-item-title" data-testid="contact-name">
      {itemTitle}
    </span>
    <span className="iog-contact-item-data" data-testid="contact-data">
      {itemData}
    </span>
  </div>
);
