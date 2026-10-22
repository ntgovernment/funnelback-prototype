(function () {
  function placeMainMenu() {
    var mainMenu = document.getElementById("mainmenu");
    var inlineSlot = document.querySelector(
      "[data-mainmenu-inline-slot='true']",
    );
    var mobileSlot = document.querySelector("[data-mainmenu-mobile-slot='true']");
    var header = document.querySelector(".ntgc-header__inner--main");
    if (!mainMenu || !inlineSlot || !mobileSlot || !header) {
      return;
    }

    var utilityLinkPatterns = [
      "phones.nt.gov.au",
      "ntgcentral.nt.gov.au/policy-library",
      "ntgcentral.nt.gov.au/ntgov-noticeboard/all-items",
      "myhr.nt.gov.au",
      "myforms.nt.gov.au",
      "ntgcentral.nt.gov.au/online-systems",
      "internal.nt.gov.au/dcdd/",
    ];

    mainMenu.querySelectorAll("ul.level-one > li").forEach(function (item) {
      var link = item.querySelector(":scope > a");
      var href = link ? link.getAttribute("href") || "" : "";
      var isUtilityLink = utilityLinkPatterns.some(function (pattern) {
        return href.indexOf(pattern) !== -1;
      });

      if (item.classList.contains("ml-auto") || isUtilityLink) {
        item.remove();
      }
    });

    mainMenu.querySelectorAll(".menu-wrapper").forEach(function (wrapper) {
      var list = wrapper.querySelector("ul.level-two");
      if (!list || wrapper.querySelector(".mobile-nav-back-link")) {
        return;
      }
      var backItem = document.createElement("li");
      backItem.className = "mobile-nav-back-link";
      var backButton = document.createElement("button");
      backButton.type = "button";
      var backIcon = document.createElement("span");
      backIcon.className = "fal fa-chevron-left";
      backIcon.setAttribute("aria-hidden", "true");
      backButton.appendChild(backIcon);
      backButton.appendChild(document.createTextNode(" Back"));
      backItem.appendChild(backButton);
      list.insertBefore(backItem, list.firstChild);
    });

    var row = inlineSlot.parentNode;
    var toggle = row.querySelector(".toggle-mobile-nav");
    var frame = null;
    var currentMode = null;

    function updatePlacement() {
      frame = null;
      var focusedElement = document.activeElement;
      inlineSlot.classList.add("is-measuring");
      inlineSlot.appendChild(mainMenu);
      var requiredWidth = inlineSlot.getBoundingClientRect().width + 24;
      var itemCount = 1;
      Array.prototype.forEach.call(row.children, function (item) {
        if (item === inlineSlot || item === toggle) {
          return;
        }
        var style = window.getComputedStyle(item);
        if (style.display === "none" || style.position === "absolute") {
          return;
        }
        var width = item.getBoundingClientRect().width;
        if (item.classList.contains("ntgc-header__search") &&
            item.classList.contains("is-open") && window.innerWidth < 1296) {
          width = Math.min(294, window.innerWidth - 160);
        }
        var marginLeft = item.classList.contains("ntgc-header__search") ? 0 : parseFloat(style.marginLeft) || 0;
        requiredWidth += width + marginLeft +
          (parseFloat(style.marginRight) || 0);
        itemCount += 1;
      });
      requiredWidth += (itemCount - 1) * (parseFloat(window.getComputedStyle(row).columnGap) || 0);
      inlineSlot.classList.remove("is-measuring");
      var mode = window.innerWidth <= 768 || requiredWidth > row.clientWidth ? "mobile" : "inline";
      if (mode === "mobile") {
        mobileSlot.appendChild(mainMenu);
      }
      header.setAttribute("data-navigation-mode", mode);
      document.body.classList.toggle("has-mobile-main-menu", mode === "mobile");
      if (mode !== currentMode) {
        document.dispatchEvent(new CustomEvent("ntgc:navigation-layout"));
        currentMode = mode;
        if (focusedElement && mainMenu.contains(focusedElement) && mode === "mobile") {
          toggle.focus();
        } else if (focusedElement === toggle && mode === "inline") {
          mainMenu.querySelector("a").focus();
        }
      } else if (focusedElement && mainMenu.contains(focusedElement) && document.activeElement !== focusedElement) {
        focusedElement.focus({ preventScroll: true });
      }
    }

    function schedulePlacement() {
      if (frame === null) {
        frame = window.requestAnimationFrame(updatePlacement);
      }
    }

    updatePlacement();
    window.addEventListener("resize", schedulePlacement);
    header.addEventListener("ntgc:search-layout", schedulePlacement);
    if (window.ResizeObserver) {
      var observer = new ResizeObserver(schedulePlacement);
      observer.observe(row);
      Array.prototype.forEach.call(row.children, function (item) {
        if (item !== inlineSlot && item !== toggle) {
          observer.observe(item);
        }
      });
    }
    if (document.fonts) {
      document.fonts.ready.then(schedulePlacement);
      document.fonts.addEventListener("loadingdone", schedulePlacement);
    }
  }

  function closeUtilityDropdowns(utilityNav) {
    utilityNav
      .querySelectorAll(".ntgc-utility-dropdown.is-open")
      .forEach(function (dropdown) {
        dropdown.classList.remove("is-open");
        var trigger = dropdown.querySelector(
          ".ntgc-navigation--utility__trigger",
        );
        if (trigger) {
          trigger.setAttribute("aria-expanded", "false");
        }
      });
  }

  function initResponsiveSearch() {
    var header = document.querySelector(".ntgc-header__inner--main");
    var search = header && header.querySelector(".ntgc-header__search");
    var form = search && search.querySelector("form");
    var input = form && form.querySelector("input");
    var submit = form && form.querySelector(".ntgc-search__submit");
    if (!header || !search || !form || !input || !submit) {
      return;
    }

    var compactLayout = window.matchMedia("(max-width: 1295px)");

    function setExpanded(isExpanded, returnFocus) {
      if (!compactLayout.matches) {
        return;
      }

      search.classList.toggle("is-open", isExpanded);
      submit.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      header.dispatchEvent(new CustomEvent("ntgc:search-layout"));
      if (isExpanded) {
        input.focus();
      } else if (returnFocus) {
        submit.focus();
      }
    }

    function updateLayout() {
      if (compactLayout.matches) {
        submit.setAttribute(
          "aria-expanded",
          search.classList.contains("is-open") ? "true" : "false",
        );
      } else {
        search.classList.remove("is-open");
        submit.removeAttribute("aria-expanded");
      }
    }

    header.classList.add("has-responsive-search");
    updateLayout();

    form.addEventListener("submit", function (event) {
      if (compactLayout.matches && !search.classList.contains("is-open")) {
        event.preventDefault();
        setExpanded(true, false);
      }
    });

    document.addEventListener("click", function (event) {
      if (compactLayout.matches && !search.contains(event.target)) {
        setExpanded(false, false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && search.classList.contains("is-open")) {
        setExpanded(false, true);
      }
    });

    window.addEventListener("resize", updateLayout);
  }

  function initUtilityNavigation() {
    initResponsiveSearch();
    placeMainMenu();
    var utilityNav = document.querySelector(".ntgc-navigation--utility");
    if (!utilityNav) {
      return;
    }

    utilityNav
      .querySelectorAll(".ntgc-utility-dropdown")
      .forEach(function (dropdown) {
        var trigger = dropdown.querySelector(
          ".ntgc-navigation--utility__trigger",
        );
        if (!trigger) {
          return;
        }

        trigger.addEventListener("click", function () {
          var shouldOpen = !dropdown.classList.contains("is-open");
          closeUtilityDropdowns(utilityNav);
          if (shouldOpen) {
            dropdown.classList.add("is-open");
            trigger.setAttribute("aria-expanded", "true");
          }
        });
      });

    document.addEventListener("click", function (event) {
      if (!utilityNav.contains(event.target)) {
        closeUtilityDropdowns(utilityNav);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeUtilityDropdowns(utilityNav);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUtilityNavigation);
  } else {
    initUtilityNavigation();
  }
})();
