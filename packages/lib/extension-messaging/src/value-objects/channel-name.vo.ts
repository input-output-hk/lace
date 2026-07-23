import type { Tagged } from 'type-fest';

/** Corresponds to underlying port name */
export type ChannelName = Tagged<string, 'ChannelName'>;
export const ChannelName = (channelName: string): ChannelName =>
  channelName as ChannelName;
ChannelName.derive = (
  baseChannelName: ChannelName,
  path: string,
): ChannelName => ChannelName(`${baseChannelName}-${path}`);
