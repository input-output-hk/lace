import React from 'react';

import { LaceRenderRoot } from './lace-render-root';

import type {
  ModuleInitDependencies,
  ModuleInitProps,
} from '@lace-contract/module';
import type { View } from '@lace-contract/views';

export interface RenderViewProps {
  dependencies: ModuleInitDependencies;
  moduleInitProps: ModuleInitProps;
  view: View;
}

export const LaceView: React.ComponentType<RenderViewProps> = ({
  view,
  moduleInitProps,
  dependencies,
}) => {
  if (!view) return;
  return (
    <LaceRenderRoot
      moduleInitProps={moduleInitProps}
      dependencies={dependencies}
      view={view}
    />
  );
};
