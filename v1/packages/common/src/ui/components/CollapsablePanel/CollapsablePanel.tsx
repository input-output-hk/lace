import React, { ReactNode, useState } from 'react';
import { Collapse } from 'antd';
import styles from './CollapsablePanel.module.scss';

const { Panel } = Collapse;

export interface CollapsablePanelProps {
  title: string;
  children: ReactNode;
}

const panelKey = 'collapsable-panel';

export const CollapsablePanel = ({ title, children }: CollapsablePanelProps): React.ReactElement => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <Collapse
      bordered={false}
      className={styles.customCollapse}
      activeKey={isPanelOpen ? panelKey : undefined}
      onChange={() => setIsPanelOpen(!isPanelOpen)}
    >
      <Panel header={title} key={panelKey}>
        {children}
      </Panel>
    </Collapse>
  );
};
