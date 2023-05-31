import React, { createContext, FC, useContext } from 'react';

export type ExternalLinkOpenerFn = (url: string) => void;

// eslint-disable-next-line unicorn/no-null
const ExternalLinkOpenerContext = createContext<ExternalLinkOpenerFn | null>(null);

export const useExternalLinkOpener = (): ExternalLinkOpenerFn => {
  const context = useContext(ExternalLinkOpenerContext);
  if (context === null) throw new Error('ExternalLinkOpenerContext not defined');
  return context;
};

const defaultExternalLinkOpener = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const ExternalLinkOpenerProvider: FC<{ value?: ExternalLinkOpenerFn }> = ({
  children,
  value = defaultExternalLinkOpener
}) => <ExternalLinkOpenerContext.Provider value={value}>{children}</ExternalLinkOpenerContext.Provider>;
