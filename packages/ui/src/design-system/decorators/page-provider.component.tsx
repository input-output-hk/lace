import type { ReactNode } from 'react';
import React, { useState } from 'react';

import { PageContext } from './page.context';

interface Props {
  children: ReactNode;
}

export const PageProvider = ({
  children,
}: Readonly<Props>): React.ReactElement => {
  const [state, setState] = useState<Element>();

  return (
    <PageContext.Provider
      value={{
        portalContainer: state,
        setPortalContainer: setState,
      }}
    >
      {children}
    </PageContext.Provider>
  );
};
