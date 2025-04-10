window.addEventListener(
  'load',
  () => {
    const script = document.createElement('script');
    script.setAttribute('src', 'app/options.js');
    document.head.appendChild(script);
  },
  { once: true }
);
