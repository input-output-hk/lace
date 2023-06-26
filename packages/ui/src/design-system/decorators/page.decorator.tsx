import React from 'react';

import type { DecoratorFunction } from '@storybook/csf/dist/story';
import type { ReactFramework } from '@storybook/react';

import { PageProvider } from './page-provider.component';
import { Page } from './page.component';

import type { PageProps } from './page.component';

export const page = (
  props: Readonly<Omit<PageProps, 'children'>>,
): DecoratorFunction<ReactFramework> => {
  const pageDecorator: DecoratorFunction<ReactFramework> = Story => (
    <PageProvider>
      <Page {...props}>
        <Story />
      </Page>
    </PageProvider>
  );

  return pageDecorator;
};
