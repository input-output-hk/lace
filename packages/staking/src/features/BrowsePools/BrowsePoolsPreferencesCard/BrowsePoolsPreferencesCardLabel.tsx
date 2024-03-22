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

  return (
    <Tooltip label={tooltip} delayDuration={800} align="start">
      {content}
    </Tooltip>
  );
};
