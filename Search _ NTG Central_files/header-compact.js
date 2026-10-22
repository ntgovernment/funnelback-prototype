(function () {
  function placeMainMenu() {
    var mainMenu = document.getElementById("mainmenu");
    var inlineSlot = document.querySelector(
      "[data-mainmenu-inline-slot='true']",
    );
    if (!mainMenu || !inlineSlot) {
      return;
    }

    var originalPosition = document.createComment("main menu position");
    mainMenu.parentNode.insertBefore(originalPosition, mainMenu);

    function updatePlacement() {
      if (window.matchMedia("(min-width: 1296px)").matches) {
        inlineSlot.appendChild(mainMenu);
      } else {
        originalPosition.parentNode.insertBefore(
          mainMenu,
          originalPosition.nextSibling,
        );
      }
    }

    updatePlacement();
    window.addEventListener("resize", updatePlacement);

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
    placeMainMenu();
    initResponsiveSearch();
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
