window.addEventListener(
  'load',
  () => {
    const script = document.createElement('script');
    script.setAttribute('src', 'app/dappConnector.js');
    document.head.appendChild(script);
  },
  { once: true }
);
