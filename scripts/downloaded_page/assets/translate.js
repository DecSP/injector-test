let translations = {};

function getScriptURLParameters() {
  const scriptElement = document.getElementById("i18nWebflowScript");

  if (!scriptElement) {
    console.error("Script element not found");
    return new URLSearchParams();
  }

  const scriptSrc = scriptElement.src;
  const url = new URL(scriptSrc);

  return new URLSearchParams(url.search);
}

async function fetchTranslations() {
  try {
    const scriptParams = getScriptURLParameters();
    const translationUrl = scriptParams.get("translationUrl");

    if (!translationUrl) {
      throw new Error("Translation URL not specified in script URL");
    }

    const response = await fetch(translationUrl);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    translations = await response.json();
  } catch (error) {
    console.error("Error fetching translations:", error);
  }
}

async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim());
  return crypto.subtle.digest("SHA-256", data).then((hashBuffer) => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  });
}

function removeAriaHiddenAttributes(node) {
  if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute("aria-hidden")) {
    node.removeAttribute("aria-hidden");
  }

  const childNodes = Array.from(node.childNodes);
  for (const child of childNodes) {
    removeAriaHiddenAttributes(child);
  }
}

async function translateNode(node, language, textHashCache) {
  if (node.parentNode && node.parentNode.id === "languageDropdown") return;
  
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.nodeName === "SCRIPT" || node.nodeName === "STYLE") return;

    removeAriaHiddenAttributes(node);

    if (node.hasAttribute("value")) {
      const valueContent = node.getAttribute("value").trim();
      if (valueContent) {
        let hash = textHashCache.get(valueContent);
        if (!hash) {
          hash = await hashText(valueContent);
          textHashCache.set(valueContent, hash);
        }
        const translatedValue = translations[language]?.[hash];
        if (translatedValue) {
          node.setAttribute("value", translatedValue);
        }
      }
    }

    const childNodes = Array.from(node.childNodes);
    if (
      childNodes.some(
        (child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim()
      )
    ) {
      const innerHTML = childNodes
        .map((child) => child.outerHTML || child.textContent)
        .join("")
        .trim();

      let hash = textHashCache.get(innerHTML);
      if (!hash) {
        hash = await hashText(innerHTML);
        textHashCache.set(innerHTML, hash);
      }
      const translatedHTML = translations[language]?.[hash];
      if (translatedHTML) {
        node.innerHTML = translatedHTML;
        return;
      }
    }

    for (const child of childNodes) {
      await translateNode(child, language, textHashCache);
    }
  }
}

async function translatePage(language) {
  if (language === "en") return;
  const textHashCache = new Map();
  await translateNode(document.body, language, textHashCache);
}

async function translateMetaTags(language) {
  if (!translations[language]) return;

  const metaTags = [
    { selector: "title", property: "textContent" },
    { selector: 'meta[name="description"]', attribute: "content" },
    { selector: 'meta[property="og:title"]', attribute: "content" },
    { selector: 'meta[property="og:description"]', attribute: "content" },
  ];

  const textHashCache = new Map();

  for (const meta of metaTags) {
    const element = document.querySelector(meta.selector);
    if (element) {
      const content = meta.property
        ? element[meta.property].trim()
        : element.getAttribute(meta.attribute).trim();
      if (content) {
        let hash = textHashCache.get(content);
        if (!hash) {
          hash = await hashText(content);
          textHashCache.set(content, hash);
        }
        const translatedContent = translations[language]?.[hash];
        if (translatedContent) {
          if (meta.property) {
            element[meta.property] = translatedContent;
          } else {
            element.setAttribute(meta.attribute, translatedContent);
          }
        }
      }
    }
  }
}

function isLanguageSupported(language) {
  return supportedLanguages.some(
    (supportedLanguage) => supportedLanguage.value === language
  );
}

function changeLanguage() {
  const dropdown = document.getElementById("languageDropdown");
  const selectedLanguage = dropdown.value;
  setLanguage(selectedLanguage);
}

function setLanguage(language) {
  const scriptParams = getScriptURLParameters();
  const usePathParam = scriptParams.get("usePathParam") === "true";

  const url = new URL(window.location);

  if (usePathParam) {
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (language === "en") {
      if (isLanguageSupported(pathParts[0])) {
        pathParts.shift();
      }
    } else {
      if (isLanguageSupported(pathParts[0])) {
        pathParts[0] = language;
      } else {
        pathParts.unshift(language);
      }
    }
    url.pathname = "/" + pathParts.join("/");
    url.searchParams.delete("lang");
  } else {
    if (language === "en") {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", language);
    }
  }

  window.history.pushState({}, "", url.href);
  window.location.reload();
}

function updateTextDirection(language) {
  const body = document.body;
  if (language === "ar") {
    body.style.direction = "rtl";
  } else {
    body.style.direction = "ltr";
  }
}

function updateDropdown(language) {
  const dropdown = document.getElementById("languageDropdown");
  dropdown.value = language;
}

function updateURL(language) {
  const scriptParams = getScriptURLParameters();
  const usePathParam = scriptParams.get("usePathParam") === "true";

  const url = new URL(window.location);

  if (usePathParam) {
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (language === "en") {
      if (isLanguageSupported(pathParts[0])) {
        pathParts.shift();
      }
    } else {
      if (isLanguageSupported(pathParts[0])) {
        pathParts[0] = language;
      } else {
        pathParts.unshift(language);
      }
    }
    url.pathname = "/" + pathParts.join("/");
    url.searchParams.delete("lang");
  } else {
    if (language === "en") {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", language);
    }
  }

  window.history.replaceState({}, "", url.href);
}

function updateLinks(language) {
  const scriptParams = getScriptURLParameters();
  const usePathParam = scriptParams.get("usePathParam") === "true";

  const links = document.querySelectorAll('a[href^="/"], a[href^="?"]');
  links.forEach((link) => {
    const href = link.getAttribute("href");
    const isQueryOnly = href.startsWith("?");

    const baseUrl = isQueryOnly ? window.location.pathname : "";
    const url = new URL(href, window.location.origin + baseUrl);

    if (usePathParam) {
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (language === "en") {
        if (isLanguageSupported(pathParts[0])) {
          pathParts.shift();
        }
      } else {
        if (isLanguageSupported(pathParts[0])) {
          pathParts[0] = language;
        } else {
          pathParts.unshift(language);
        }
      }
      url.pathname = "/" + pathParts.join("/");
      url.searchParams.delete("lang");
    } else {
      if (language === "en") {
        url.searchParams.delete("lang");
      } else {
        url.searchParams.set("lang", language);
      }
    }

    const newHref = isQueryOnly ? url.search : url.pathname + url.search;
    link.setAttribute("href", newHref);
  });
}

function addHreflangAndCanonicalTags(currentLanguage) {
  const scriptParams = getScriptURLParameters();
  const usePathParam = scriptParams.get("usePathParam") === "true";

  const head = document.head;

  document
    .querySelectorAll('link[rel="alternate"], link[rel="canonical"]')
    .forEach((el) => el.remove());

  const baseUrl = window.location.origin;
  const currentPath = window.location.pathname;
  const pathParts = currentPath.split("/").filter(Boolean);

  supportedLanguages.forEach((language) => {
    const hreflangLink = document.createElement("link");
    hreflangLink.rel = "alternate";
    hreflangLink.hreflang = language.value;

    let hrefPathParts = [...pathParts];

    if (usePathParam) {
      if (language.value === "en") {
        if (isLanguageSupported(hrefPathParts[0])) {
          hrefPathParts.shift();
        }
      } else {
        if (isLanguageSupported(hrefPathParts[0])) {
          hrefPathParts[0] = language.value;
        } else {
          hrefPathParts.unshift(language.value);
        }
      }
      hreflangLink.href = `${baseUrl}/${hrefPathParts.join("/")}`;
    } else {
      const url = new URL(baseUrl + currentPath);
      if (language.value === "en") {
        url.searchParams.delete("lang");
      } else {
        url.searchParams.set("lang", language.value);
      }
      hreflangLink.href = url.href;
    }
    head.appendChild(hreflangLink);
  });

  const canonicalLink = document.createElement("link");
  canonicalLink.rel = "canonical";

  let canonicalPathParts = [...pathParts];

  if (usePathParam) {
    if (currentLanguage === "en") {
      if (isLanguageSupported(canonicalPathParts[0])) {
        canonicalPathParts.shift();
      }
    } else {
      if (isLanguageSupported(canonicalPathParts[0])) {
        canonicalPathParts[0] = currentLanguage;
      } else {
        canonicalPathParts.unshift(currentLanguage);
      }
    }
    canonicalLink.href = `${baseUrl}/${canonicalPathParts.join("/")}`;
  } else {
    const url = new URL(baseUrl + currentPath);
    if (currentLanguage === "en") {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", currentLanguage);
    }
    canonicalLink.href = url.href;
  }
  head.appendChild(canonicalLink);
}

function createLanguageSelector() {
  const languageSelector = document.createElement("div");
  languageSelector.id = "languageSelector";
  languageSelector.className = "language-selector";

  const dropdown = document.createElement("select");
  dropdown.id = "languageDropdown";
  dropdown.onchange = changeLanguage;

  supportedLanguages.forEach((language) => {
    const option = document.createElement("option");
    option.value = language.value;
    option.textContent = language.text;
    dropdown.appendChild(option);
  });

  languageSelector.appendChild(dropdown);
  document.body.appendChild(languageSelector);

  const style = document.createElement("style");
  style.textContent = `
    .language-selector {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 10%;
      padding: 10px;
      text-align: center;
      z-index: 1000;
    }
    .language-selector select {
      padding: 8px;
      font-size: 16px;
      border: 1px solid #aaa;
      border-radius: 4px;
      -webkit-appearance: none;
      background-image: url(data:image/svg+xml,%3Csvg%20width%3D%2264px%22%20height%3D%2264px%22%20viewBox%3D%22-102.4%20-102.4%201228.80%201228.80%22%20class%3D%22icon%22%20version%3D%221.1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22%23aaaaaa%22%20stroke%3D%22%23aaaaaa%22%20stroke-width%3D%2222.528%22%3E%3Cg%20id%3D%22SVGRepo_bgCarrier%22%20stroke-width%3D%220%22%3E%3C%2Fg%3E%3Cg%20id%3D%22SVGRepo_tracerCarrier%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3C%2Fg%3E%3Cg%20id%3D%22SVGRepo_iconCarrier%22%3E%3Cpath%20d%3D%22M903.232%20256l56.768%2050.432L512%20768%2064%20306.432%20120.768%20256%20512%20659.072z%22%20fill%3D%22%23aaaaaa%22%3E%3C%2Fpath%3E%3C%2Fg%3E%3C%2Fsvg%3E);
      background-repeat: no-repeat;
      background-position: right 7px center;
      background-size: 12px;
      width: 100px;
    }
  `;

  document.head.appendChild(style);
}

document.addEventListener("DOMContentLoaded", async () => {
  await fetchTranslations();

  const urlParams = new URLSearchParams(window.location.search);

  const language = isLanguageSupported(urlParams.get("lang"))
    ? urlParams.get("lang")
    : "en";

  createLanguageSelector();

  updateTextDirection(language);
  updateDropdown(language);

  // Fix slider direction for RTL languages
  const slider = document.querySelector(".w-slider");

  if (slider) {
    slider.style.direction = "ltr";
  }

  if (language !== "en") {
    await Promise.all([translatePage(language), translateMetaTags(language)]);
  }

  updateLinks(language);
  updateURL(language);
  addHreflangAndCanonicalTags(language);
});

window.addEventListener("popstate", () => {
  window.location.reload();
});

const supportedLanguages = [
  { value: "en", text: "English" },
  { value: "fr", text: "Français" },
  { value: "ja", text: "日本語" },
  { value: "ko", text: "한국어" },
  { value: "es", text: "Español" },
  { value: "de", text: "Deutsch" },
  { value: "zh-cn", text: "简体中文" },
  { value: "zh-hk", text: "繁體中文" },
  { value: "pt", text: "Português" },
  { value: "ar", text: "العربية" },
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getScriptURLParameters,
    fetchTranslations,
    hashText,
    removeAriaHiddenAttributes,
    translatePage,
    isLanguageSupported,
    translations,
  };
}
