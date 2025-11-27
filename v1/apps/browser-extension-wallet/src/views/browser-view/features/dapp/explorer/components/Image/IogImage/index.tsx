/* eslint-disable react/prop-types */
import * as React from 'react';
import classNames from 'classnames';
import { Image } from 'antd';
import { IogImageProps } from '../types';
import { mixins } from '../../../global/styles/Themes';
import ImageError from '../../../assets/icons/image-error.component.svg';

import './styles.scss';

export const IogImage = React.memo<IogImageProps>(
  ({ size, width, height, spacer, overflow, fit, circle, className, preview = false, fluid, src, ...props }) => {
    const hasImageContainerFluid = fluid && { width: '100%' };

    return (
      <Image
        className={classNames([
          {
            'iog-image': true,
            'iog-image--circle': circle,
            'iog-image--loaded': true,
            'has-overflow--hidden': overflow
          },
          className
        ])}
        src={src}
        preview={preview}
        fallback={ImageError}
        // onError={(e) => {
        //   if (onError) onError(e);
        // }}
        {...{
          ...hasImageContainerFluid,
          ...props
        }}
        style={{
          ...mixins.setSize({ size, width, height }),
          ...mixins.setSpacer(spacer, true),
          ...mixins.setObjectFit(fit)
        }}
      />
    );
  }
);

IogImage.displayName = 'IogImage';
