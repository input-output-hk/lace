import React from 'react';

import type { DecoratorFunction } from '@storybook/csf/dist/story';
import type { ReactFramework } from '@storybook/react';

import { Page } from './page.component';

import type { Props } from './page.component';

export const page = (
  props: Readonly<Omit<Props, 'children'>>,
): DecoratorFunction<ReactFramework> => {
  const pageDecorator: DecoratorFunction<ReactFramework> = Story => (
    <Page {...props}>
      <Story />
    </Page>
  );

  return pageDecorator;
};
