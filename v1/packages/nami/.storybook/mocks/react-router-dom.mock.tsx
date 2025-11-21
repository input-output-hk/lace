import { fn } from '@storybook/test';
import React from 'react';

export * from 'react-router-dom';

export let mockedHistory: string[] = [];

export const useHistory: jest.Mock = fn(() => ({
  push: () => void 0,
  replace: (route: string) => (mockedHistory = [route]),
})).mockName('useHistory');

export const useLocation: jest.Mock = fn().mockName('useHistory');

export const HashRouter: jest.Mock = fn(({ children }) => <>{children} </>).mockName(
  'HashRouter',
);

export const Switch: jest.Mock = fn(({ children }) => <>{children} </>).mockName('Switch');

export const Route: jest.Mock = fn().mockName('Route');
