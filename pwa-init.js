(() => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });

  let deferredPrompt = null;

  function isStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function getInstallButtons() {
    return Array.from(document.querySelectorAll('[data-install-app]'));
  }

  function dedupeInstallButtons() {
    const grouped = new Map();
    getInstallButtons().forEach((button) => {
      const scope = button.closest('#menuPanel, #topMenu, [id*="menu" i]') || document.body;
      const key = scope.id || '__global__';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(button);
    });

    grouped.forEach((buttons) => {
      if (buttons.length <= 1) return;
      const preferred = buttons.find((b) => b.getAttribute('data-install-menu-item') !== 'true') || buttons[0];
      buttons.forEach((button) => {
        if (button === preferred) return;
        button.classList.add('hidden');
        button.setAttribute('aria-hidden', 'true');
      });
    });
  }

  function setInstallButtonsVisible(visible) {
    dedupeInstallButtons();
    getInstallButtons().forEach((button) => {
      if (button.getAttribute('aria-hidden') === 'true') return;
      if (visible) button.classList.remove('hidden');
      else button.classList.add('hidden');
    });
  }

  async function handleInstallClick(event) {
    if (deferredPrompt && typeof deferredPrompt.prompt === 'function') {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      window.deferredInstallPrompt = null;
      setInstallButtonsVisible(false);
      return;
    }

    alert('Install option not available yet. Open in Chrome and use browser menu → Install app / Add to Home screen.');
  }

  function bindInstallButtons() {
    dedupeInstallButtons();
    getInstallButtons().forEach((button) => {
      if (button.getAttribute('aria-hidden') === 'true') return;
      if (button.dataset.installBound === 'true') return;
      button.dataset.installBound = 'true';
      button.addEventListener('click', handleInstallClick);
    });
  }

  bindInstallButtons();

  if (isStandaloneMode()) {
    setInstallButtonsVisible(false);
  } else {
    setInstallButtonsVisible(true);
  }

  const installObserver = new MutationObserver(() => {
    bindInstallButtons();
    if (!isStandaloneMode()) {
      setInstallButtonsVisible(true);
    }
  });

  if (document.body) {
    installObserver.observe(document.body, { childList: true, subtree: true });
  }

  window.promptInstallApp = handleInstallClick;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    window.deferredInstallPrompt = deferredPrompt;

    bindInstallButtons();
    if (!isStandaloneMode()) {
      setInstallButtonsVisible(true);
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.deferredInstallPrompt = null;
    setInstallButtonsVisible(false);
    installObserver.disconnect();
  });
})();
