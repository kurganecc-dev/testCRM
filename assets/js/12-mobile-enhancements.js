    (function mobileEnhancements() {
      const root = document.documentElement;
      function setViewportHeight() { root.style.setProperty('--app-vh', (window.innerHeight * 0.01) + 'px'); }
      function markMobile() { document.body.classList.toggle('is-mobile-layout', window.matchMedia('(max-width: 1023px)').matches); }
      function scrollActiveTabIntoView() {
        const active = document.querySelector('#mainTabs .tab-active');
        if (active && window.matchMedia('(max-width: 1023px)').matches) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
      function attachHorizontalScroll(selector) {
        const el = document.querySelector(selector);
        if (!el || el.dataset.mobileScrollReady) return;
        el.dataset.mobileScrollReady = 'true';
        el.addEventListener('wheel', event => {
          if (!window.matchMedia('(max-width: 1023px)').matches) return;
          if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) { el.scrollLeft += event.deltaY; event.preventDefault(); }
        }, { passive: false });
      }
      function enhance() {
        setViewportHeight(); markMobile(); scrollActiveTabIntoView();
        ['#mainTabs', '#quickFilters', '#calendarTabs', '#view-kanban', '.calendar-grid'].forEach(attachHorizontalScroll);
      }
      window.addEventListener('resize', enhance, { passive: true });
      window.addEventListener('orientationchange', enhance, { passive: true });
      document.addEventListener('click', event => { if (event.target.closest('.view-tab')) requestAnimationFrame(scrollActiveTabIntoView); });
      enhance();
    })();
