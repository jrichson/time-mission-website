async function stubBriqWidgetScript(page, options = {}) {
  const briqScript = { requests: 0 };
  const mountDelayMs = Number(options.mountDelayMs || 0);
  await page.route('https://widgetcdn.briqbookings.com/widget/widget.js', async (route) => {
    briqScript.requests += 1;
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        (function () {
          var mountDelayMs = ${JSON.stringify(mountDelayMs)};

          function widgetStateIsOpen(state) {
            return String(state || '').indexOf('o|is|true') !== -1;
          }

          function openWidget(host) {
            var root = host.shadowRoot;
            if (!root) return;
            var main = root.querySelector('.bw-widget-main');
            if (!main) return;
            main.classList.remove('bw-closed');
            main.classList.add('bw-open');
            window.__briqBookingOpened = (window.__briqBookingOpened || 0) + 1;
          }

          function closeWidget(host) {
            var root = host.shadowRoot;
            if (!root) return;
            var main = root.querySelector('.bw-widget-main');
            if (!main) return;
            main.classList.remove('bw-open');
            main.classList.add('bw-closed');
          }

          function mountBriqWidgets() {
            document.querySelectorAll('.bw-widget').forEach(function (widget) {
              if (widget.shadowRoot) return;
              var root = widget.attachShadow({ mode: 'open' });
              var main = document.createElement('main');
              main.className = 'bw-widget-main bw-closed';
              main.setAttribute('data-briq-stub-main', '');
              if (!String(widget.getAttribute('data-features') || '').includes('hideMainButton')) {
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'widget-button';
                button.setAttribute('data-briq-stub-button', '');
                button.textContent = widget.getAttribute('data-button-text') || 'BOOK NOW';
                button.addEventListener('click', function () {
                  openWidget(widget);
                });
                main.appendChild(button);
              }
              root.appendChild(main);
            });
            document.querySelectorAll('.bw-widget-toggle').forEach(function (toggle) {
              if (toggle.__briqStubBound) return;
              toggle.__briqStubBound = true;
              toggle.addEventListener('click', function () {
                var host = document.querySelector('.bw-widget');
                if (!host) return;
                if (widgetStateIsOpen(toggle.getAttribute('data-widget-state'))) openWidget(host);
                else closeWidget(host);
              });
            });
          }

          function scheduleMountBriqWidgets() {
            if (mountDelayMs > 0) {
              setTimeout(mountBriqWidgets, mountDelayMs);
              return;
            }
            mountBriqWidgets();
          }

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', scheduleMountBriqWidgets);
          } else {
            scheduleMountBriqWidgets();
          }
        })();
      `,
    });
  });
  return briqScript;
}

module.exports = {
  stubBriqWidgetScript,
};
