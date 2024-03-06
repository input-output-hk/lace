import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

import { ReactComponent as Info } from '../../../assets/icons/info-icon.component.svg';

export interface InfoItemProps {
  title: string;
  dataTestId?: string;
}
export const InfoItem = ({ title, dataTestId = '' }: InfoItemProps): React.ReactElement => (
  <Tooltip title={title}>
    {Info ? (
      <Info data-testid={`${dataTestId}-info`} style={{ fontSize: '18px', color: '#8f97a8', cursor: 'pointer' }} />
    ) : (
      <InfoCircleOutlined />
    )}
  </Tooltip>
);
