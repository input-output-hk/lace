import { ISvgIconsMetaDataValue, IVendorIconsMetaDataValue, TIconsMetaData } from './types';
import { EIconsName, EIconsTypes } from './enum';

const SVGMetaData = {
  type: EIconsTypes.SVG
};

const IconsMetaData: TIconsMetaData = new Map([
  // SVG
  [
    EIconsName.ALERT,
    { ...SVGMetaData, svgPathKey: EIconsName.ALERT, defaultViewBox: '0 0 20 19', defaultFill: '#FF5470' }
  ],

  [
    EIconsName.AUDIT_LEVEL_ONE,
    { ...SVGMetaData, svgPathKey: EIconsName.AUDIT_LEVEL_ONE, defaultViewBox: '0 0 20 20', defaultFill: 'none' }
  ],

  [EIconsName.ARROW_BACK, { ...SVGMetaData, svgPathKey: EIconsName.ARROW_BACK, defaultFill: '#7D5DEB' }],
  [
    EIconsName.ARROW_DOWN,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.ARROW_DOWN
    }
  ],
  [
    EIconsName.ARROW_LEFT,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.ARROW_LEFT,
      defaultFill: 'none',
      defaultViewBox: '0 0 8 11',
      defaultStrokeColor: '#8F97A8'
    }
  ],
  [
    EIconsName.ARROW_RIGHT,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.ARROW_RIGHT,
      defaultFill: 'none',
      defaultViewBox: '0 0 8 11',
      defaultStrokeColor: '#8F97A8'
    }
  ],
  [
    EIconsName.ARROW_THIN_PREV,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.ARROW_THIN_PREV,
      defaultFill: 'none',
      defaultStrokeColor: '#ffffff',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.ARROW_PREV,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.ARROW_PREV,
      defaultFill: 'none',
      defaultStrokeColor: '#878E9E',
      defaultViewBox: '0 0 11 9'
    }
  ],
  [
    EIconsName.ARROW_NEXT,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.ARROW_NEXT,
      defaultFill: 'none',
      defaultStrokeColor: '#878E9E',
      defaultViewBox: '0 0 11 9'
    }
  ],
  [
    EIconsName.ARROW_NARROW_LEFT,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.ARROW_NARROW_LEFT,
      strokeColor: '#EAEAFE',
      defaultViewBox: '0 0 18 18'
    }
  ],
  [
    EIconsName.ARROW_NARROW_RIGHT,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.ARROW_NARROW_RIGHT,
      strokeColor: '#EAEAFE',
      defaultViewBox: '0 0 18 18'
    }
  ],
  [
    EIconsName.AWESOME_VIEW,
    {
      ...SVGMetaData,
      defaultViewBox: '0 0 36 36',
      svgPathKey: EIconsName.AWESOME_VIEW,
      defaultFill: '#717385'
    }
  ],
  [
    EIconsName.BORDER_VOID,
    {
      ...SVGMetaData,
      defaultViewBox: '0 0 81 81',
      svgPathKey: EIconsName.BORDER_VOID,
      defaultFill: 'none'
    }
  ],
  [
    EIconsName.BORDER_DASHED,
    {
      ...SVGMetaData,
      defaultViewBox: '0 0 110 110',
      svgPathKey: EIconsName.BORDER_DASHED,
      defaultFill: 'none'
    }
  ],
  [
    EIconsName.SIMPLE_VIEW,
    {
      ...SVGMetaData,
      defaultViewBox: '0 0 32 32',
      svgPathKey: EIconsName.SIMPLE_VIEW,
      defaultFill: '#717385'
    }
  ],
  [
    EIconsName.CHECK,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.CHECK,
      defaultViewBox: '0 0 11 9',
      strokeColor: '#fff',
      defaultFill: 'none'
    }
  ],
  [
    EIconsName.CROSS,
    {
      ...SVGMetaData,
      defaultViewBox: '0 0 9 9',
      svgPathKey: EIconsName.CROSS,
      strokeColor: '#ffffff'
    }
  ],
  [EIconsName.FILE, { ...SVGMetaData, svgPathKey: EIconsName.FILE, defaultViewBox: '0 0 27 26' }],
  [EIconsName.PASSWORD_OFF, { ...SVGMetaData, svgPathKey: EIconsName.PASSWORD_OFF, defaultFill: 'none' }],
  [
    EIconsName.PASSWORD_ON,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.PASSWORD_ON,
      defaultFill: 'none'
    }
  ],
  [EIconsName.SEARCH, { ...SVGMetaData, svgPathKey: EIconsName.SEARCH }],
  [EIconsName.SEARCH_LACE_THEME, { ...SVGMetaData, svgPathKey: EIconsName.SEARCH_LACE_THEME }],
  [
    EIconsName.TRASH,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.TRASH,
      strokeColor: '#7D5DEB',
      defaultViewBox: '0 0 25 25'
    }
  ],
  [
    EIconsName.INFORMATION,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.INFORMATION,
      defaultStrokeColor: '#878E9E',
      defaultFill: 'none',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.GRID,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.GRID,
      defaultFill: '#212121',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.EXPLORE,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.EXPLORE,
      defaultFill: '#878E9E',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.MAIL,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.MAIL,
      defaultFill: 'none',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.WEBSITE,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.WEBSITE,
      defaultFill: 'none',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.FACEBOOK,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.FACEBOOK,
      defaultFill: '#6F7786',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.TWITTER,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.TWITTER,
      defaultFill: '#6F7786',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.INSTAGRAM,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.INSTAGRAM,
      defaultFill: '#6F7786',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.TELEGRAM,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.TELEGRAM,
      defaultFill: '#6F7786',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.THREADS,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.THREADS,
      defaultFill: '#6F7786',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.MEDIUM,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.MEDIUM,
      defaultFill: '#6F7786',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.REDDIT,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.REDDIT,
      defaultFill: '#6F7786',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.LINKTREE,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.LINKTREE,
      defaultFill: '#6F7786',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.DISCORD,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.DISCORD,
      defaultFill: '#6F7786',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.GITHUB,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.GITHUB,
      defaultFill: '#6F7786',
      defaultViewBox: '0 0 24 24'
    }
  ],
  [
    EIconsName.WHITEPAPER,
    {
      ...SVGMetaData,
      svgPathKey: EIconsName.WHITEPAPER,
      defaultFill: '#6F7786',
      defaultViewBox: '0 0 24 24'
    }
  ]
]);

const getIconMetaData = (name: EIconsName): IVendorIconsMetaDataValue | ISvgIconsMetaDataValue | undefined =>
  IconsMetaData.get(name);

export default getIconMetaData;
