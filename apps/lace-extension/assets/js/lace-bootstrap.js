(() => {
  const node = document.getElementById('lace-assets');
  if (!node) return;
  const assets = JSON.parse(node.textContent);

  const attach = () => {
    assets.styles.forEach(href => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      document.head.appendChild(l);
    });
    assets.scripts.forEach(src => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      document.body.appendChild(s);
    });
  };

  if (document.readyState === 'complete') {
    setTimeout(attach, 0);
  } else {
    addEventListener('load', () => setTimeout(attach, 0), { once: true });
  }
})();
