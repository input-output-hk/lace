/* eslint-disable react/no-multi-comp */
import React, { ReactElement, ReactNode } from 'react';
import cn from 'classnames';
import {
  Timeline as AntTimeline,
  TimelineProps as AntTimelineProps,
  TimelineItemProps as AntTimelineItemProps
} from 'antd';
import styles from './Timeline.module.scss';

interface TimelineProps extends AntTimelineProps {
  className?: string;
  children?: ReactNode | ReactNode[];
}

interface TimelineItemProps extends AntTimelineItemProps {
  active?: boolean;
}

const Timeline = ({ children, className = '', ...props }: TimelineProps): ReactElement => (
  <AntTimeline className={cn(styles.sideTimeline, { [className]: className })} {...props}>
    {children}
  </AntTimeline>
);

Timeline.Item = ({ children, active = false, ...props }: TimelineItemProps): ReactElement => (
  <AntTimeline.Item
    dot={active ? <div className={styles.activeDot} /> : <div className={styles.inactiveDot} />}
    {...props}
  >
    {children}
  </AntTimeline.Item>
);

export { Timeline };
