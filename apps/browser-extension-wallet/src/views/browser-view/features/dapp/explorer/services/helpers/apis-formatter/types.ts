interface ISectionCardItemImage {
  alt: string;
  src: string;
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
  id: string;
  categories: string[];
  title: string;
  link: string;
  image?: ISectionCardItemImage;
  shortDescription: string;
  longDescription: string;
  screenshots?: IScreenshot[];
  email: string;
  companyWebsite: string;
  socialLinks: Array<{
    title: string;
    type: string;
    url: string;
  }>;
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
