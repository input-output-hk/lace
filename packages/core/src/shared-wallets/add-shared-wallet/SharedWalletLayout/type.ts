export type LayoutNavigationDownloadProps = LayoutNavigationProps & {
  onDownload: () => void;
};

export type LayoutNavigationProps = {
  onBack?: () => void;
  onNext?: () => void;
};
