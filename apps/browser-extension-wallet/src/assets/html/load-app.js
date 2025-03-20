window.addEventListener(
  'load',
  () => {
    const vendors = document.createElement('script');
    vendors.setAttribute('src', 'app/vendors.js');
    document.head.appendChild(vendors);

    const script = document.createElement('script');
    script.setAttribute('src', 'app/options.js');
    document.head.appendChild(script);
  },
  { once: true }
);
