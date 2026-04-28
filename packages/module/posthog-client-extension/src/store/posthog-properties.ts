export const getDefaultPosthogProperties = (
  navigator: Navigator | undefined,
  location: Location,
) => {
  let context = {};
  if (navigator) {
    const userAgent = navigator.userAgent;
    const osValue = os(navigator);
    context = {
      ...context,
      ...(osValue !== undefined && { $os: osValue }),
      $browser: browser(userAgent, navigator.vendor, /opera/i.test(userAgent)),
      $device: device(userAgent),
      $current_url: location.href,
      $host: location.host,
      $pathname: location.pathname,
      $browser_version: browserVersion(
        userAgent,
        navigator.vendor,
        /opera/i.test(userAgent),
      ),
      $insert_id:
        Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 10),
      $time: currentTimestamp() / 1000,
    };
  }

  return context;
};

export const currentTimestamp = (): number => Date.now();

const includes = (haystack: string, needle: string): boolean =>
  haystack.includes(needle);

const browser = (
  userAgent: string,
  vendor: string,
  opera?: boolean,
): string => {
  const normalizedVendor = vendor || ''; // vendor is undefined for at least IE9
  if (opera || includes(userAgent, ' OPR/')) {
    if (includes(userAgent, 'Mobile')) {
      return 'Opera Mobile';
    }
    return 'Opera';
  } else if (/(blackberry|playbook|bb10)/i.test(userAgent)) {
    return 'BlackBerry';
  } else if (
    includes(userAgent, 'IEMobile') ||
    includes(userAgent, 'WPDesktop')
  ) {
    return 'Internet Explorer Mobile';
  } else if (includes(userAgent, 'SamsungBrowser/')) {
    // https://developer.samsung.com/internet/user-agent-string-format
    return 'Samsung Internet';
  } else if (includes(userAgent, 'Edge') || includes(userAgent, 'Edg/')) {
    return 'Microsoft Edge';
  } else if (includes(userAgent, 'FBIOS')) {
    return 'Facebook Mobile';
  } else if (includes(userAgent, 'Chrome')) {
    return 'Chrome';
  } else if (includes(userAgent, 'CriOS')) {
    return 'Chrome iOS';
  } else if (includes(userAgent, 'UCWEB') || includes(userAgent, 'UCBrowser')) {
    return 'UC Browser';
  } else if (includes(userAgent, 'FxiOS')) {
    return 'Firefox iOS';
  } else if (includes(normalizedVendor, 'Apple')) {
    if (includes(userAgent, 'Mobile')) {
      return 'Mobile Safari';
    }
    return 'Safari';
  } else if (includes(userAgent, 'Android')) {
    return 'Android Mobile';
  } else if (includes(userAgent, 'Konqueror')) {
    return 'Konqueror';
  } else if (includes(userAgent, 'Firefox')) {
    return 'Firefox';
  } else if (includes(userAgent, 'MSIE') || includes(userAgent, 'Trident/')) {
    return 'Internet Explorer';
  } else if (includes(userAgent, 'Gecko')) {
    return 'Mozilla';
  } else {
    return 'Undefined Browser';
  }
};

const browserVersion = (
  userAgent: string,
  vendor: string,
  opera: boolean,
): number | null => {
  const regexList = {
    'Internet Explorer Mobile': /rv:(\d+(\.\d+)?)/,
    'Microsoft Edge': /Edge?\/(\d+(\.\d+)?)/,
    Chrome: /Chrome\/(\d+(\.\d+)?)/,
    'Chrome iOS': /CriOS\/(\d+(\.\d+)?)/,
    'UC Browser': /(UCBrowser|UCWEB)\/(\d+(\.\d+)?)/,
    Safari: /Version\/(\d+(\.\d+)?)/,
    'Mobile Safari': /Version\/(\d+(\.\d+)?)/,
    Opera: /(Opera|OPR)\/(\d+(\.\d+)?)/,
    Firefox: /Firefox\/(\d+(\.\d+)?)/,
    'Firefox iOS': /FxiOS\/(\d+(\.\d+)?)/,
    Konqueror: /Konqueror:(\d+(\.\d+)?)/,
    BlackBerry: /BlackBerry (\d+(\.\d+)?)/,
    'Android Mobile': /android\s(\d+(\.\d+)?)/,
    'Samsung Internet': /SamsungBrowser\/(\d+(\.\d+)?)/,
    'Internet Explorer': /(rv:|MSIE )(\d+(\.\d+)?)/,
    Mozilla: /rv:(\d+(\.\d+)?)/,
  };

  const browserString = browser(
    userAgent,
    vendor,
    opera,
  ) as keyof typeof regexList;
  const regex: RegExp = regexList[browserString] || undefined;

  if (regex === undefined) {
    return null;
  }
  const matches = userAgent.match(regex);
  if (!matches) {
    return null;
  }
  return Number.parseFloat(<string>matches.at(-2));
};

const os = (navigator: Navigator | undefined): string | undefined => {
  if (!navigator) {
    return undefined;
  }

  const a = navigator.userAgent;
  if (/windows/i.test(a)) {
    if (/Phone/.test(a) || /WPDesktop/.test(a)) {
      return 'Windows Phone';
    }
    return 'Windows';
  } else if (/(iPhone|iPad|iPod)/.test(a)) {
    return 'iOS';
  } else if (/Android/.test(a)) {
    return 'Android';
  } else if (/(blackberry|playbook|bb10)/i.test(a)) {
    return 'BlackBerry';
  } else if (/mac/i.test(a)) {
    return 'Mac OS X';
  } else if (/Linux/.test(a)) {
    return 'Linux';
  } else if (/CrOS/.test(a)) {
    return 'Chrome OS';
  } else {
    return 'Undefined OS';
  }
};

const device = (userAgent: string): string => {
  if (/windows phone/i.test(userAgent) || /WPDesktop/.test(userAgent)) {
    return 'Windows Phone';
  } else if (/iPad/.test(userAgent)) {
    return 'iPad';
  } else if (/iPod/.test(userAgent)) {
    return 'iPod Touch';
  } else if (/iPhone/.test(userAgent)) {
    return 'iPhone';
  } else if (/(blackberry|playbook|bb10)/i.test(userAgent)) {
    return 'BlackBerry';
  } else if (/Android/.test(userAgent)) {
    return 'Android';
  } else if (/windows nt|macintosh|linux/i.test(userAgent)) {
    return 'Desktop';
  } else {
    return 'Undefined Device';
  }
};
