interface ISectionCardItemImage {
  alt: string;
  src: string;
  width: number;
  height: number;
}

export interface ICertification {
  id: number;
  name: string;
  level: number;
  description: string;
  icon: ISectionCardItemImage;
}

export interface ISectionCardCertificate {
  id: number;
  certification: ICertification;
  issuedAt: string;
  pdfLink: string;
  summary: string;
}

export interface ISectionCardItem {
  subject: string;
  category: string;
  title: string;
  shortDescription: string;
  subcategory: string;
  link: string;
  image?: Partial<ISectionCardItemImage>;
  longDescription: string;
  screenshots?: IScreenshot[];
  providerName: string;
  email: string;
  companyWebsite: string;
  certificates?: Partial<ISectionCardCertificate[]>;
  selectedCertificate?: Partial<ISectionCardCertificate>;
  isCertified?: boolean;
}

export interface ISectionCard {
  id: string | number;
  name: string;
  subcategory: string;
  count?: number;
  color: string;
  planetAnimation?: string;
  items?: ISectionCardItem[];
}

export interface IFiltersBadge {
  label: string;
  value: string;
  'data-testid': string;
}

export interface IScreenshot {
  url: string;
}
