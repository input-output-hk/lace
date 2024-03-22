import { Text, Tooltip } from '@lace/ui';

interface BrowsePoolsPreferencesCardProps {
  tooltip?: string;
  text: string;
}
export const BrowsePoolsPreferencesCardLabel = ({ text, tooltip }: BrowsePoolsPreferencesCardProps) => {
  const content = <Text.Body.Large weight="$medium">{text}</Text.Body.Large>;
  if (!tooltip) {
    return content;
  }

  // zIndex is aligned with legacy side-panel
  // Please follow: apps/browser-extension-wallet/src/views/browser-view/components/CollapsiblePanelContainer/CollapsiblePanelContainer.module.scss
  return (
    <Tooltip label={tooltip} delayDuration={800} align="start" zIndex={201}>
      {content}
    </Tooltip>
  );
};
