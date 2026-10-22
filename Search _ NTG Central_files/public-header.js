(() => {
  const initialize = () => {
    const menu = document.getElementById('mainmenu');
    const toggle = document.querySelector('.toggle-mobile-nav');
    const closeMenu = () => {
      menu?.querySelectorAll('li.active').forEach(item => item.classList.remove('active'));
      document.body.classList.remove('shaded', 'menuopen');
      menu?.setAttribute('data-mobile-showlevel', 'levelone');
      toggle?.setAttribute('aria-expanded', 'false');
    };
    toggle?.addEventListener('click', event => {
      event.preventDefault();
      if (document.body.classList.contains('menuopen')) closeMenu();
      else {
        document.body.classList.add('shaded', 'menuopen');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
    toggle?.addEventListener('keydown', event => {
      if (event.key === ' ') {
        event.preventDefault();
        toggle.click();
      }
    });
    menu?.addEventListener('click', event => {
      const back = event.target.closest('.mobile-nav-back-link');
      const link = event.target.closest('ul.level-one > li > a.dropdown');
      if (back) {
        event.preventDefault();
        const item = back.closest('li.active');
        item?.classList.remove('active');
        menu.setAttribute('data-mobile-showlevel', 'levelone');
        item?.querySelector(':scope > a')?.focus();
      } else if (link) {
        event.preventDefault();
        const item = link.closest('li');
        const wasOpen = item.classList.contains('active');
        closeMenu();
        if (!wasOpen) {
          item.classList.add('active');
          document.body.classList.add('shaded', 'menuopen');
          menu.setAttribute('data-mobile-showlevel', 'leveltwo');
          toggle?.setAttribute('aria-expanded', 'true');
          if (document.body.classList.contains('has-mobile-main-menu')) item.querySelector('.mobile-nav-back-link button')?.focus();
        }
      }
    });
    document.addEventListener('click', event => {
      if (!menu?.contains(event.target) && !toggle?.contains(event.target)) closeMenu();
      const accordion = event.target.closest('.js-au-accordion');
      if (accordion) {
        const panel = document.getElementById(accordion.getAttribute('aria-controls'));
        const open = accordion.getAttribute('aria-expanded') !== 'true';
        accordion.setAttribute('aria-expanded', String(open));
        for (const node of [accordion, panel].filter(Boolean)) {
          node.classList.toggle('au-accordion--closed', !open);
          node.classList.toggle('au-accordion--open', open);
          node.classList.toggle('ntgc-accordion--closed', !open);
        }
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (document.body.classList.contains('has-mobile-main-menu') && document.body.classList.contains('menuopen')) toggle?.focus();
        closeMenu();
      }
    });
    document.addEventListener('ntgc:navigation-layout', closeMenu);
    document.querySelectorAll('.ntgc-link-to-top').forEach(link => link.setAttribute('href', '#top'));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();