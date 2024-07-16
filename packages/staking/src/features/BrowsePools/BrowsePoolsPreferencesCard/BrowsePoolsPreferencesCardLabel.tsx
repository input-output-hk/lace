import { Text, Tooltip } from '@input-output-hk/lace-ui-toolkit';

interface BrowsePoolsPreferencesCardProps {
  tooltip: string;
  text: string;
}
export const BrowsePoolsPreferencesCardLabel = ({ text, tooltip }: BrowsePoolsPreferencesCardProps) => (
  // zIndex is aligned with legacy side-panel
  // Please follow: apps/browser-extension-wallet/src/views/browser-view/components/CollapsiblePanelContainer/CollapsiblePanelContainer.module.scss
  <Tooltip align="start" side="top" label={tooltip} delayDuration={800} zIndex={201}>
    <Text.Body.Large weight="$medium">{text}</Text.Body.Large>
  </Tooltip>
);
