const ORIGIN = "https://centifi.app";

const LANG_PREFIX: Record<string, string> = {
  en: "",
  tr: "tr/",
  de: "de/",
  fr: "fr/",
  es: "es/",
};

export function centifiLegalUrls(language?: string | null) {
  const lang = language && language in LANG_PREFIX ? language : "en";
  const prefix = LANG_PREFIX[lang];
  const deletePath = lang === "tr" ? "tr/delete-account.html" : "delete-account.html";
  return {
    privacy: `${ORIGIN}/${prefix}privacy.html`,
    terms: `${ORIGIN}/${prefix}terms.html`,
    deleteAccount: `${ORIGIN}/${deletePath}`,
  };
}

export function accountDeletionMailto(accountEmail?: string) {
  const subject = encodeURIComponent("Account deletion request (Centifi)");
  const body = encodeURIComponent(
    accountEmail
      ? `Please delete my Centifi account.\n\nAccount email: ${accountEmail}`
      : "Please delete my Centifi account.\n\nAccount email: ",
  );
  return `mailto:info@centifi.app?subject=${subject}&body=${body}`;
}
