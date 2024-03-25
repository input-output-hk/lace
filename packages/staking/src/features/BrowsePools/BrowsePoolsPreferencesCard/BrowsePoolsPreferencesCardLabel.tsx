import { Text, Tooltip } from '@lace/ui';

interface BrowsePoolsPreferencesCardProps {
  tooltip: string;
  text: string;
}
export const BrowsePoolsPreferencesCardLabel = ({ text, tooltip }: BrowsePoolsPreferencesCardProps) => (
  // zIndex is aligned with legacy side-panel
  // Please follow: apps/browser-extension-wallet/src/views/browser-view/components/CollapsiblePanelContainer/CollapsiblePanelContainer.module.scss
  <Tooltip label={tooltip} delayDuration={800} align="start" zIndex={201}>
    <Text.Body.Large weight="$medium">{text}</Text.Body.Large>
  </Tooltip>
);
