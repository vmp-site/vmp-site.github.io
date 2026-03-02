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

  function setInstallButtonsVisible(visible) {
    getInstallButtons().forEach((button) => {
      if (visible) button.classList.remove('hidden');
      else button.classList.add('hidden');
    });
  }

  async function handleInstallClick(event) {
    if (event) event.preventDefault();

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
    getInstallButtons().forEach((button) => {
      if (button.dataset.installBound === 'true') return;
      button.dataset.installBound = 'true';
      button.addEventListener('click', handleInstallClick);
    });
  }

  bindInstallButtons();

  if (isStandaloneMode()) {
    setInstallButtonsVisible(false);
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
  });
})();
