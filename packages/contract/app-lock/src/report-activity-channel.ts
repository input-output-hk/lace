import { BehaviorSubject, Subject } from 'rxjs';

export type ReportActivityChannel = {
  reportActivity: () => Promise<void>;
};

export type ExposeActivityChannel = (channel: ReportActivityChannel) => void;
export type ConsumeActivityChannel = () => ReportActivityChannel;

export type ActivityChannelExtension = {
  exposeActivityChannel: ExposeActivityChannel;
  consumeActivityChannel: ConsumeActivityChannel;
};

const defaultExposingChannel$ =
  new BehaviorSubject<ReportActivityChannel | null>(null);
const defaultExposeChannel: ExposeActivityChannel = activityChannel => {
  defaultExposingChannel$.next(activityChannel);
};
const defaultConsumeChannel: ConsumeActivityChannel = () => {
  if (!defaultExposingChannel$.value) {
    throw new Error('Activity Channel not available');
  }
  return defaultExposingChannel$.value;
};

type InitialiseActivityChannelParams = {
  exposeChannel?: ExposeActivityChannel;
};

export const initialiseActivityChannel = ({
  exposeChannel = defaultExposeChannel,
}: InitialiseActivityChannelParams = {}) => {
  const subject = new Subject<void>();
  exposeChannel({
    reportActivity: async () => {
      subject.next(void 0);
    },
  });
  return {
    activity$: subject.asObservable(),
  };
};

type ConsumeActivityChannelParams = {
  consumeChannel?: ConsumeActivityChannel;
};

export const connectActivityChannel = ({
  consumeChannel = defaultConsumeChannel,
}: ConsumeActivityChannelParams = {}) => consumeChannel();
