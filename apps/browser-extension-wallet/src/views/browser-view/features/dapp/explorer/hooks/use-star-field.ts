/* eslint-disable no-console */
import React from 'react';

const useStartField = (isInExperience = true) => {
  // eslint-disable-next-line wrap-regex
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  React.useEffect(() => {
    const iogLayout = document.querySelector('.iog-layout');

    const starfield = document.createElement('div');
    starfield.className = 'stars';

    if (isSafari && !!starfield) starfield.classList.add('twinkle');

    if (iogLayout && starfield) iogLayout.append(starfield);

    return () => {
      starfield.remove();
    };
  }, [isInExperience]);
};

export default useStartField;
