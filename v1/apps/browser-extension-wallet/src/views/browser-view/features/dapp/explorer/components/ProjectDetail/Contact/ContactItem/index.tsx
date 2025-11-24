import * as React from 'react';
import { IIcon } from '../../../../components/Icon/types';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { useExternalLinkOpener } from '@providers';
import capitalize from 'lodash/fp/capitalize';

interface ContactItemType {
  itemIcon: React.ReactElement<IIcon>;
  itemTitle: string;
  itemData: string;
  ofLinkType?: boolean;
  testId?: string;
}

export const ContactItem: React.FC<ContactItemType> = ({
  itemIcon,
  itemTitle,
  itemData,
  ofLinkType = false,
  testId
}) => {
  const openExternalLink = useExternalLinkOpener();
  const onClick: React.MouseEventHandler = (event) => {
    event.preventDefault();
    openExternalLink(itemData);
  };

  return (
    <div className="iog-contact-item" data-testid="contact-item">
      {itemIcon && (
        <span className="iog-contact-item-icon" data-testid={testId ? `${testId}-icon` : 'contact-icon'}>
          {itemIcon}
        </span>
      )}
      <Flex flexDirection="column">
        <Text.Body.Normal weight="$bold" data-testid={testId ? `${testId}-label` : 'contact-title'}>
          {capitalize(itemTitle)}
        </Text.Body.Normal>
        {ofLinkType && (
          <a
            href={itemData}
            target="_blank"
            rel="noreferrer"
            onClick={onClick}
            data-testid={testId ? `${testId}-url` : 'contact-url'}
          >
            {itemData}
          </a>
        )}
        {!ofLinkType && (
          <span className="iog-contact-item-data" data-testid={testId ? `${testId}-data` : 'contact-data'}>
            {itemData}
          </span>
        )}
      </Flex>
    </div>
  );
};
