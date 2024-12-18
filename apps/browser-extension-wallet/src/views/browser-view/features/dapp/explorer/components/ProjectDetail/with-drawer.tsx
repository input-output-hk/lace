import * as React from 'react';
import { Portal } from 'react-portal';
import ProjectDetail from '../ProjectDetail';
import { DrawerProvider } from './drawer';

const withDrawer = <P extends Record<any, any>>(Component: React.ComponentType<P>): React.FC<P> =>
  React.memo((props) => (
    <DrawerProvider>
      <Component {...{ ...props }} />
      <Portal node={document.querySelector('#dAppStore')}>
        <ProjectDetail />
      </Portal>
    </DrawerProvider>
  ));

export { withDrawer };
