import { ICategory, ICertificate, IFeature } from '../../../services/api/categories/types';
import { IDApp, IDAppScreenShot } from '../../../services/api/d-app/types';
import {
  IFiltersBadge,
  IScreenshot,
  ISectionCard,
  ISectionCardCertificate,
  ISectionCardItem,
  ISectionRelated
} from './types';

export const formatFiltersResponse = (categories: ICategory[] | undefined): IFiltersBadge[] | [] =>
  categories?.map((category) => ({
    label: category.name,
    value: category.name,
    'data-testid': `classic-filter-${category.name.toLowerCase()}`
  })) || [];

export const createDappItemsImage = (logo: IDApp['logo']): ISectionCardItem['image'] => ({
  alt: '',
  src: logo,
  width: 0,
  height: 0
});

export const createDappItemsFeatures = (feature: IFeature): ISectionRelated => ({
  alt: feature?.picture?.alternativeText,
  url: feature?.picture?.formats?.thumbnail?.url || feature?.picture?.url,
  caption: feature?.picture?.caption,
  title: feature?.title,
  description: feature?.description
});

export const createDappItemsScreenshots = (shots: IDAppScreenShot[]): IScreenshot[] =>
  shots.map((s) => ({ url: s.data }));

export const createDappItemsCertificates = (certificate: ICertificate): ISectionCardCertificate => ({
  id: certificate?.id,
  certification: {
    id: certificate?.certification?.id,
    name: certificate?.certification?.name,
    level: certificate?.certification?.level,
    description: certificate?.certification?.description,
    icon: {
      alt: certificate?.certification?.icon?.name,
      src: certificate?.certification?.icon?.url,
      width: certificate?.certification?.icon?.width,
      height: certificate?.certification?.icon?.height
    }
  },
  issuedAt: certificate?.issuedAt,
  pdfLink: certificate?.pdfLink,
  summary: certificate?.summary
});

export const createDappItems = (dapp: IDApp): ISectionCardItem => ({
  subject: dapp.subject,
  link: dapp.link,
  providerName: dapp.companyName,
  category: dapp.categories?.[0]?.name,
  subcategory: '',
  shortDescription: dapp.shortDescription,
  title: dapp.projectName,
  longDescription: dapp.longDescription,
  image: createDappItemsImage(dapp.logo),
  companyWebsite: dapp.companyWebsite,
  email: dapp.companyEmail,
  screenshots: createDappItemsScreenshots(dapp.screenshots),
  isCertified: false,
  certificates: [],
  selectedCertificate: undefined
});

export const formatSectionsResponse = (categories?: ICategory[]): ISectionCard[] | [] =>
  categories?.map((category) => ({
    id: category?.id,
    name: category?.name,
    subcategory: category?.subcategories?.[0]?.name || '',
    count: category?.dApps?.length,
    color: category?.primaryColor,
    planetAnimation: category?.lottie?.url,
    items: category?.dApps?.map((dapp) => createDappItems(dapp))
  })) || [];

export const maybeGetCategoryName = (value: string): string | undefined => (value === 'all' ? undefined : value);
