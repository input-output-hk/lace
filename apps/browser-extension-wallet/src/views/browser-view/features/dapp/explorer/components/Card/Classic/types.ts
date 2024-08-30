interface IIogCardImage {
  alt: string;
  src: string;
  width: number;
  height: number;
}

export interface IogCardProps {
  categories?: string[];
  title: string;
  description?: string;
  isCertified?: boolean;
  image?: Partial<IIogCardImage>;
  onClick?: (value?: any) => void;
}
