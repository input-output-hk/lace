window.addEventListener(
  'load',
  () => {
    const script = document.createElement('script');
    script.setAttribute('src', 'js/popup.js');
    document.head.appendChild(script);
  },
  { once: true }
);
