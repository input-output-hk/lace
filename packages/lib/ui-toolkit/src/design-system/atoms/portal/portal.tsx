import {
  PortalProvider as RNPortalProvider,
  PortalHost as RNPortalHost,
  Portal as RNPortal,
} from '@gorhom/portal';
import React from 'react';

type PortalProviderProps = {
  children: React.ReactNode;
  // Used to access a custom portal
  rootHostName?: string;
};

export const ContentPortalProvider = ({ children }: PortalProviderProps) => {
  return <RNPortalProvider>{children}</RNPortalProvider>;
};

type PortalHostProps = { name: string };
export const ContentPortalHost = ({ name }: PortalHostProps) => {
  return <RNPortalHost name={name} />;
};

type PortalProps = {
  children: React.ReactNode;
  hostName?: string;
};
export const ContentPortal = ({ hostName, children }: PortalProps) => {
  return <RNPortal hostName={hostName}>{children}</RNPortal>;
};
