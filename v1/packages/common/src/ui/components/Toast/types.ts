import { MessageArgsProps } from 'antd';

export interface ToastProps {
  duration?: number;
  text: string;
  withProgressBar?: boolean;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  style?: MessageArgsProps['style'];
  className?: string;
  key?: MessageArgsProps['key'];
  onClose?: () => void;
}
