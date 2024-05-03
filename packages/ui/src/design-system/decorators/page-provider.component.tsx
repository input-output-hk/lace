import type { ReactNode } from 'react';
import React, { useState } from 'react';

import { PageContext } from './page.context';

import type { PageContextValue } from './page.context';

interface Props {
  children: ReactNode;
}

export const PageProvider = ({
  children,
}: Readonly<Props>): React.ReactElement => {
  const [state, setState] = useState<
    Pick<
      PageContextValue,
      'darkThemePortalContainer' | 'lightThemePortalContainer'
    >
  >({});

  return (
    <PageContext.Provider
      value={{
        ...state,
        setPortalContainers: ({ lightTheme, darkTheme }): void => {
          setState({
            lightThemePortalContainer: lightTheme,
            darkThemePortalContainer: darkTheme,
          });
        },
      }}
    >
      {children}
    </PageContext.Provider>
  );
};
