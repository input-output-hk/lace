import { fn } from '@storybook/test';
import React from 'react';

export * from 'react-router-dom';

export let mockedHistory: string[] = [];

export const useHistory = fn(() => ({
  push: () => void 0,
  replace: (route: string) => (mockedHistory = [route]),
})).mockName('useHistory');

export const HashRouter = fn(({ children }) => <>{children} </>).mockName(
  'HashRouter',
);

export const Switch = fn(({ children }) => <>{children} </>).mockName('Switch');

export const Route = fn().mockName('Route');
