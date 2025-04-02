window.addEventListener(
  'load',
  () => {
    const script = document.createElement('script');
    script.setAttribute('src', 'app/popup.js');
    document.head.appendChild(script);
  },
  { once: true }
);
