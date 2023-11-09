import React from 'react';

import type { DecoratorFunction } from '@storybook/types';

import { PageProvider } from './page-provider.component';
import { Page } from './page.component';

import type { PageProps } from './page.component';

export const page = (
  props: Readonly<Omit<PageProps, 'children'>>,
): DecoratorFunction => {
  const pageDecorator: DecoratorFunction = Story => (
    <PageProvider>
      <Page {...props}>{Story()}</Page>
    </PageProvider>
  );

  return pageDecorator;
};
