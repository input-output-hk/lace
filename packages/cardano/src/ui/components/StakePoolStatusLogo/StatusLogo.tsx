import React from 'react';
import Icon from '@ant-design/icons';
import { Tooltip as AntdTooltip } from 'antd';
import { Cardano } from '@cardano-sdk/core';
import { ReactComponent as MoonIcon } from '../../assets/icons/moon.component.svg';
import { ReactComponent as BadgeCheckIcon } from '../../assets/icons/badge-check.component.svg';
import { ReactComponent as WarningIon } from '../../assets/icons/warning.component.svg';
import { TranslationsFor } from '@wallet/util/types';

type StakePoolStatuses = 'retired' | 'retiring';

const overlayInnerStyle = {
  padding: '0px',
  borderRadius: '12px',
  boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.08)'
};

export interface StatusLogoProps {
  status: Cardano.StakePoolStatus;
  className?: string;
  isDelegated: boolean;
  isOversaturated?: boolean;
  translations: TranslationsFor<'retiring' | 'retired' | 'delegating' | 'saturated'>;
}

export const StatusLogo = ({
  status,
  className,
  isDelegated,
  isOversaturated,
  translations
}: StatusLogoProps): React.ReactElement => {
  const statusInfo: Partial<Record<StakePoolStatuses, string>> = {
    [Cardano.StakePoolStatus.Retiring]: translations.retiring,
    [Cardano.StakePoolStatus.Retired]: translations.retired
  };

  const statusIcons: Partial<Record<StakePoolStatuses, React.ReactElement>> = {
    [Cardano.StakePoolStatus.Retiring]: <Icon style={{ fontSize: '17px', color: '#FFC72E' }} component={MoonIcon} />,
    [Cardano.StakePoolStatus.Retired]: <Icon style={{ fontSize: '17px', color: '#FC5659' }} component={MoonIcon} />
  };

  let currentStatus: StakePoolStatuses | undefined;
  if (status === 'retired' || status === 'retiring') {
    currentStatus = status;
  }
  const icon = statusIcons[currentStatus];
  const description = statusInfo[currentStatus];

  return (
    <>
      {icon ? (
        <AntdTooltip overlayInnerStyle={overlayInnerStyle} placement="top" title={description}>
          <div className={className} data-testid="stake-pool-badge">
            {icon}
          </div>
        </AntdTooltip>
      ) : (
        <></>
      )}
      {isDelegated && (
        <AntdTooltip overlayInnerStyle={overlayInnerStyle} placement="top" title={translations.delegating}>
          <div className={className} data-testid="stake-pool-badge-delegated">
            <Icon style={{ fontSize: '17px', color: '#22A892' }} component={BadgeCheckIcon} />
          </div>
        </AntdTooltip>
      )}
      {isOversaturated && (
        <AntdTooltip overlayInnerStyle={overlayInnerStyle} placement="top" title={translations.saturated}>
          <div className={className} data-testid="stake-pool-badge-oversaturated">
            <Icon style={{ fontSize: '17px', color: '#ff5470' }} component={WarningIon} />
          </div>
        </AntdTooltip>
      )}
    </>
  );
};
