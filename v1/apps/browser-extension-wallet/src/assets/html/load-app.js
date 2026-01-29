window.addEventListener(
  'load',
  () => {
    const script = document.createElement('script');
    script.setAttribute('src', 'app/options.js');
    document.head.appendChild(script);
  },
  { once: true }
);

// this should prevent https://web.dev/articles/bfcache
window.onunload = () => {
  console.log('unload');
};
