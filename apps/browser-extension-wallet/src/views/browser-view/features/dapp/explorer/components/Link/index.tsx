import * as React from 'react';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { mixins } from '../../global/styles/Themes';
import { ILink } from './types';
import './styles.scss';

const IogLink: React.FC<ILink> = ({ children, margin, disabled, spacer, badgeColor, ...props }) => (
  <div
    className={classNames({
      'iog-link-container': true,
      'iog-link-container--badge': Boolean(badgeColor),
      'iog-link-container--disabled': disabled
    })}
    style={{
      ...mixins.setSpacer(spacer, true),
      ...mixins.setMargin(margin, true),
      ...mixins.setBackground(badgeColor)
    }}
  >
    <Link className="iog-link" {...props}>
      {children}
    </Link>
  </div>
);

export default IogLink;
