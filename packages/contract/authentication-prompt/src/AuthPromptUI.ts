import { useLoadModules } from './hooks';

export const AuthPromptUI = () => {
  const [renderAuthenticationPromptUI = () => null] =
    useLoadModules('addons.loadRenderAuthPromptUI') || [];

  return renderAuthenticationPromptUI();
};
