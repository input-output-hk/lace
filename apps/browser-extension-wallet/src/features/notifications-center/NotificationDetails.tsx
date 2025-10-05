/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types, promise/catch-or-return, sonarjs/cognitive-complexity, no-magic-numbers, unicorn/no-null */
import React from 'react';
import { ContentLayout } from '@src/components/Layout';
import { useTranslation } from 'react-i18next';
import { useNotificationsCenter } from '@hooks/useNotificationsCenter';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { NavigationButton } from '@lace/common';
import { useHistory } from 'react-router';
import { SectionTitle } from '@components/Layout/SectionTitle';

export const NotificationDetails = (): React.ReactElement => {
  const { t } = useTranslation();
  const { unreadNotifications } = useNotificationsCenter();
  const history = useHistory();

  return (
    <ContentLayout
      title={
        <SectionTitle
          isPopup
          title={
            <Flex alignItems="center" gap="$8">
              <NavigationButton icon="arrow" onClick={() => history.goBack()} />
              {t('notificationsCenter.title')}
            </Flex>
          }
          sideText={`(${unreadNotifications})`}
          data-testid="notifications-details-title"
        />
      }
    >
      <div>
        <h1>Notification Details</h1>
      </div>
    </ContentLayout>
  );
};
