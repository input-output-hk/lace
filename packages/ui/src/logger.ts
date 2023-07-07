type LoggableComponent = 'PieChart';
type LogLevel = 'error' | 'warn';

interface LogConfig {
  componentName: string;
  data?: unknown;
  message: string[] | string;
}
type LogFunction = (config: Readonly<Omit<LogConfig, 'componentName'>>) => void;
type Logger = Record<LogLevel, LogFunction>;

const namespace = 'UI-Toolkit';
const namespaceSeparator = '::';
const componentSeparator = ' ';

// https://github.com/microsoft/TypeScript/issues/17002
// eslint-disable-next-line functional/prefer-immutable-types
const formatMessage = (message: string[] | string): string =>
  Array.isArray(message) ? `\n${message.join('\n')}` : message;

const buildMessageArguments = ({
  componentName,
  message,
  data,
}: Readonly<LogConfig>): unknown[] =>
  [
    `${namespace}${namespaceSeparator}${componentName}${componentSeparator}${formatMessage(
      message,
    )}`,
    data,
  ].filter(Boolean);

const getLogFunctionByLevel = (
  logLevel: LogLevel,
  componentName: LoggableComponent,
): LogFunction => {
  const logFunction = console[logLevel];
  return config => {
    logFunction(...buildMessageArguments({ ...config, componentName }));
  };
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = (): void => {};

/**
 * Creates scoped logger based on component name.
 *
 * Please ensure that log messages are clear and concise.
 * Include corresponding data either in the `data` property or as `${interpolation}` in the message.
 * If message is a `string[]` it will be rendered multiline.
 */
const getLogger = (componentName: LoggableComponent): Logger => ({
  warn: getLogFunctionByLevel('warn', componentName),
  error: getLogFunctionByLevel('error', componentName),
});

const getMockLogger: typeof getLogger = () => ({
  warn: noop,
  error: noop,
});

export const createLogger =
  process.env.NODE_ENV === 'development' ? getLogger : getMockLogger;
