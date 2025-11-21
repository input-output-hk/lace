/* eslint-disable no-magic-numbers */
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactTooltip, { TooltipProps } from 'react-tooltip';

import styles from './CustomTooltip.module.scss';

const regexFirefox = /firefox|fxios/i;

export interface CustomTooltipProps extends TooltipProps {
  /** HTML element id */
  id: TooltipProps['id'];
  /** Text to display in the tooltip */
  text: string;
  /** Element to display tooltip over */
  children: React.ReactNode;
}

export const CustomTooltip = ({ id, text, children, ...tooltipProps }: CustomTooltipProps): React.ReactElement => {
  const userAgent = navigator.userAgent;
  const tooltipRoot = useRef(document.createElement('div'));

  useEffect(() => {
    document.body.append(tooltipRoot.current);
    const tooltip = tooltipRoot.current;
    return () => tooltip.remove();
  }, []);

  //  This is a workaround, we need to keep looking for the actual fix
  const handleMouseEnter = () => {
    const element = document.querySelector(`#${id}`);
    element?.classList.add('show');
  };

  const handleMouseLeave = () => {
    const element = document.querySelector(`#${id}`);
    element?.classList.remove('show');
  };

  const tooltipDelayHide = regexFirefox.test(userAgent) ? 1000 : 0;

  return (
    <div
      className={styles.ContainerTooltip}
      data-testid="custom-tooltip"
      data-for={id}
      data-tip={text}
      data-iscapture="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {createPortal(
        <ReactTooltip delayHide={tooltipDelayHide} className={styles.tooltipContent} id={id} {...tooltipProps}>
          {text}
        </ReactTooltip>,
        tooltipRoot.current
      )}
      {children}
    </div>
  );
};
