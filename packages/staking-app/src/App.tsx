import React from 'react';
import { Staking, OutsideHandlesProvider, OutsideHandlesProviderProps } from '@lace/staking';

const App = () => (
  <>
    <h1>Embed Staking</h1>
    <OutsideHandlesProvider {...({} as OutsideHandlesProviderProps)}>
      <Staking theme="light" />
    </OutsideHandlesProvider>
  </>
);

export default App;
