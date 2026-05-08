/**
 * Android BankNotificationSpendHeuristic ile aynı mantık.
 * Play (`com.android.vending`): yalnızca tutar, satın alma metni veya gelir/iade ipucu — kurulum bildirimi değil.
 * Banka ve diğer paketler: belirsizde kabul (kaçırmayı azaltır). Wallet/Pay: güçlü spam dışında kabul.
 */

const STRONG_SPAM: string[] = [
  "verification code",
  "security code",
  "otp",
  "one-time password",
  "authentication code",
  "doğrulama kodu",
  "dogrulama kodu",
  "güvenlik kodu",
  "guvenlik kodu",
  "bestätigungscode",
  "bestatigungscode",
  "code de vérification",
  "code de verification",
  "código de verificación",
  "codigo de verificacion",
  "reset your password",
  "password reset",
  "şifre sıfırla",
  "passwort zurücksetzen",
  "réinitialis",
  "reinitialis",
  "restablecer contraseña",
  "newsletter",
  "e-bülten",
  "unsubscribe",
  "take our survey",
  "rate our app",
  "leave a review",
  "bewerten sie uns",
  "bewerten sie die",
  "uygulamayı değerlendir",
  "değerlendirin",
  "degerlendirin",
  "umfrage",
  "sondage",
  "encuesta",
  "anketimize",
  "çekiliş",
  "cekilis",
  "gewinnspiel",
  "jeu concours",
  "sorteo",
  "you've won",
  "you won",
];

const SPEND_HINTS: string[] = [
  "payment",
  "purchase",
  "purchased",
  "spent",
  "spend",
  "charged",
  "debited",
  "withdrawal",
  "pos purchase",
  "card transaction",
  "transaction",
  "paid to",
  "paid with",
  "merchant",
  "order receipt",
  "harcama",
  "ödeme",
  "odeme",
  "alıveriş",
  "alisveris",
  "işlem tutarı",
  "islem tutari",
  "işlem bedeli",
  "islem bedeli",
  "işlem no",
  "islem no",
  "işleminiz",
  "isleminiz",
  "işlem özeti",
  "islem ozeti",
  "hesabınızdan",
  "hesabinizdan",
  "kartınız",
  "kartiniz",
  "çekim",
  "cekim",
  "harcandı",
  "harcandi",
  "abbuchung",
  "zahlung",
  "einkauf",
  "lastschrift",
  "überweisung",
  "uberweisung",
  "ausgegeben",
  "kartenzahlung",
  "paiement",
  "achat",
  "acheté",
  "achete",
  "débit",
  "debit",
  "retrait",
  "pago",
  "compra",
  "cargo",
  "retiro",
  "transaccion",
  "transacción",
];

const INCOME_HINTS: string[] = [
  "income",
  "salary",
  "payroll",
  "refund",
  "cashback",
  "interest",
  "dividend",
  "deposited",
  "deposit",
  "received from",
  "incoming",
  "incoming transfer",
  "credited",
  "gelir",
  "maaş",
  "maas",
  "iade",
  "yatırıldı",
  "yatirildi",
  "hesabınıza",
  "hesabiniza",
  "aktarıldı",
  "aktarildi",
  "havale",
  "transfer geldi",
  "tahsilat",
  "gutschrift",
  "gehalt",
  "rückerstattung",
  "ruckerstattung",
  "erhalten",
  "eingang",
  "salaire",
  "remboursement",
  "crédité",
  "credite",
  "virement entrant",
  "ingreso",
  "nómina",
  "nomina",
  "reembolso",
  "abonado",
  "recibido",
];

const PLAY_WALLET_HINTS: string[] = [
  "you purchased",
  "you bought",
  "thank you for your purchase",
  "your order",
  "order receipt",
  "order confirmation",
  "your google play order",
  "in-app purchase",
  "in app purchase",
  "subscription",
  "renewed",
  "was renewed",
  "receipt",
  "sent a payment",
  "paid you",
  "you paid",
  "money received",
  "you received",
  "payment received",
  "satın alındı",
  "satin alindi",
  "satın aldınız",
  "satin aldiniz",
  "satın alma",
  "satin alma",
  "siparişiniz",
  "siparisiniz",
  "google play sipariş",
  "google play siparis",
  "uygulama içi satın alma",
  "uygulama ici satin alma",
  "abonelik",
  "abonelik yenilendi",
  "ödeme alındı",
  "odeme alindi",
  "size gönderildi",
  "size gonderildi",
  "play points",
  "in-app",
  "in app",
  "kauf bestätigt",
  "kauf bestatigt",
  "gekauft",
  "vielen dank für ihren einkauf",
  "danke für ihren einkauf",
  "ihre bestellung",
  "bestellbestätigung",
  "bestellbestatigung",
  "play store-bestellung",
  "hat dir gesendet",
  "geld erhalten",
  "zahlung erhalten",
  "überweisung erhalten",
  "uberweisung erhalten",
  "mit google pay bezahlt",
  "abonnement verlängert",
  "abonnement verlangert",
  "in-app-kauf",
  "in app-kauf",
  "im app-kauf",
  "achat sur",
  "merci pour votre achat",
  "votre commande google play",
  "confirmation de commande",
  "reçu de commande",
  "recu de commande",
  "vous a envoyé",
  "vous avez payé",
  "vous avez paye",
  "paiement reçu",
  "paiement recu",
  "virement reçu",
  "abonnement renouvelé",
  "abonnement renouvele",
  "achat intégré",
  "achat integre",
  "google pay",
  "compra realizada",
  "compra en google play",
  "gracias por tu compra",
  "gracias por su compra",
  "confirmación de pedido",
  "confirmacion de pedido",
  "recibo de google play",
  "compra en la app",
  "compra dentro de la app",
  "suscripción renovada",
  "suscripcion renovada",
  "te envió",
  "te envio",
  "te pagó",
  "te pago",
  "pago recibido",
  "transferencia recibida",
  "pago con google pay",
  "abonnement",
  "facture google play",
  "moyen de paiement",
  "zahlungsmittel",
  "billing",
  "facturation",
  "wallet",
  "cüzdan",
  "cuzdan",
  "tap to pay",
  "contactless",
  "sent you",
  "request money",
  "para gönderdi",
  "para gönderildi",
  "gönderildi",
  "gonderildi",
  "transfer sent",
  "peer-to-peer",
];

const PLAY_STORE_PACKAGE = "com.android.vending";

const WALLET_PAY_PACKAGES = new Set([
  "com.google.android.apps.walletnfcrel",
  "com.google.android.apps.pay",
]);

const PLAY_CONTEXT_HINTS: string[] = [
  "google play",
  "play store",
  "google play store",
  "play yükle",
  "tienda google play",
  "boutique google play",
];

const PLAY_INSTALL_OR_DOWNLOAD_HINTS: string[] = [
  "downloading",
  "download complete",
  "download in progress",
  "download paused",
  "waiting for wi-fi",
  "waiting for wifi",
  "waiting for wi fi",
  "installing",
  "installation",
  "installed",
  "updating",
  "update in progress",
  "pending download",
  "remaining",
  "minutes left",
  "seconds left",
  "minutes restantes",
  "il reste",
  "quedan",
  "minutos restantes",
  "verbleibend",
  "verbleibende zeit",
  "dakika",
  "kaldı",
  "kaldi",
  "indiriliyor",
  "indirme",
  "indirildi",
  "yükleniyor",
  "yukleniyor",
  "kuruluyor",
  "kurulum",
  "kuruldu",
  "güncelleniyor",
  "guncelleniyor",
  "güncelleme",
  "guncelleme",
  "yükleme işlemi",
  "yukleme islemi",
  "kurulum işlemi",
  "kurulum islemi",
  "indirme işlemi",
  "indirme islemi",
  "güncelleme işlemi",
  "guncelleme islemi",
  "herunterladen",
  "wird heruntergeladen",
  "wird installiert",
  "installation läuft",
  "wartet auf wlan",
  "wartet auf wi-fi",
  "aktualisierung",
  "wird aktualisiert",
  "téléchargement",
  "telechargement",
  "téléchargement en cours",
  "telechargement en cours",
  "installation en cours",
  "mise à jour",
  "mise a jour",
  "en attente du wi-fi",
  "en attente du wifi",
  "descargando",
  "descarga completa",
  "descarga completada",
  "descarga en pausa",
  "instalando",
  "instalación",
  "instalacion",
  "actualizando",
  "actualización",
  "actualizacion",
  "esperando a wi-fi",
  "esperando a wifi",
  "installazione",
  "download läuft",
];

const PLAY_PURCHASE_HINTS: string[] = [
  "you purchased",
  "you bought",
  "thank you for your purchase",
  "your order",
  "order receipt",
  "order confirmation",
  "your google play order",
  "purchase successful",
  "purchase complete",
  "payment successful",
  "payment completed",
  "payment received",
  "your purchase",
  "charged to",
  "subscription",
  "renewed",
  "was renewed",
  "auto-renewing",
  "receipt",
  "in-app purchase",
  "in app purchase",
  "satın alındı",
  "satin alindi",
  "satın aldınız",
  "satin aldiniz",
  "satın alma",
  "satin alma",
  "siparişiniz",
  "siparisiniz",
  "google play sipariş",
  "google play siparis",
  "uygulama içi satın alma",
  "uygulama ici satin alma",
  "abonelik",
  "abonelik yenilendi",
  "play points",
  "kauf bestätigt",
  "kauf bestatigt",
  "gekauft",
  "vielen dank für ihren einkauf",
  "danke für ihren einkauf",
  "ihre bestellung",
  "bestellbestätigung",
  "bestellbestatigung",
  "play store-bestellung",
  "abonnement verlängert",
  "abonnement verlangert",
  "abonnement wurde verlängert",
  "abonnement wurde verlangert",
  "in-app-kauf",
  "in app-kauf",
  "im app-kauf",
  "achat sur",
  "merci pour votre achat",
  "votre commande google play",
  "confirmation de commande",
  "reçu de commande",
  "recu de commande",
  "renouvellement",
  "abonnement renouvelé",
  "abonnement renouvele",
  "achat intégré",
  "achat integre",
  "compra realizada",
  "compra en google play",
  "gracias por tu compra",
  "gracias por su compra",
  "confirmación de pedido",
  "confirmacion de pedido",
  "recibo de google play",
  "compra en la app",
  "compra dentro de la app",
  "suscripción renovada",
  "suscripcion renovada",
  "pago realizado",
  "pago efectuado",
  "facture google play",
  "moyen de paiement",
  "zahlungsmittel",
  "billing",
  "facturation",
  "acquisto completato",
  "ordine confermato",
  "rinnovo abbonamento",
  "abbonamento rinnovato",
  "compra aprovada",
  "pagamento aprovado",
  "assinatura renovada",
  "renovação de assinatura",
  "renovacao de assinatura",
  "aankoop voltooid",
  "bestelling bevestigd",
  "betaling voltooid",
  "zakup zakończony",
  "płatność zakończona",
  "platnosc zakonczona",
  "оплата прошла",
  "oplata proshla",
  "покупка оформлена",
  "pokupka oformlena",
  "подписка возобновлена",
  "podpiska vozobnovlena",
  "подписка продлена",
  "podpiska prodlena",
];

/** Play Store "12.50 MB" / yüzde ilerleme tutarı tetiklemesin (Android ile aynı). */
const SCRUB_FILE_SIZE_AND_PERCENT =
  /\d[\d.,'\s]{0,14}\s*(?:mb|mib|gb|gib|kb|kib)(?:\s*\/\s*s)?\b|\d[\d.,'\s]{0,14}\s*%+\b|\d[\d.,'\s]*[.,]\d{2}\s*%+\b/gi;

const AMOUNT_RE =
  /(?:[₺€£]\s*\d[\d.'\s]*(?:[.,]\d{1,2})?)|(?:\d[\d.'\s]*[.,]\d{2}\s*(?:[₺€£]|\bTL\b|\bTRY\b|\bEUR\b|\bUSD\b|\bGBP\b))|(?:\b(?:TL|TRY|EUR|USD|GBP)\s*\d)|(?:\$\s*\d)|(?:\d[\d.'\s]*[.,]\d{2}\s*\$)/i;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsInsensitive(combined: string, snippets: readonly string[]): boolean {
  for (const s of snippets) {
    try {
      if (new RegExp(escapeRe(s), "iu").test(combined)) return true;
    } catch {
      if (combined.toLowerCase().includes(s.toLowerCase())) return true;
    }
  }
  return false;
}

function scrubSizesAndPercents(text: string): string {
  try {
    return text.replace(SCRUB_FILE_SIZE_AND_PERCENT, " ");
  } catch {
    return text.replace(/MB|GB|KB/gi, " ");
  }
}

function hasAmountLike(title: string, body: string): boolean {
  return AMOUNT_RE.test(scrubSizesAndPercents(`${title} ${body}`));
}

function hasPlayStoreContext(combined: string): boolean {
  return containsInsensitive(combined, PLAY_CONTEXT_HINTS);
}

function looksLikePlayStoreInstallOrDownloadOnly(combined: string, packageName: string): boolean {
  if (containsInsensitive(combined, PLAY_PURCHASE_HINTS)) return false;
  if (!containsInsensitive(combined, PLAY_INSTALL_OR_DOWNLOAD_HINTS)) return false;
  return hasPlayStoreContext(combined) || packageName === PLAY_STORE_PACKAGE;
}

function isWalletOrPayPackage(packageName: string): boolean {
  return WALLET_PAY_PACKAGES.has(packageName);
}

/** Harcama, gelir, Play / Wallet; belirsizde true; yalnızca güçlü spamde false. */
export function isLikelySpendBankNotification(
  title: string,
  body: string,
  packageName: string = "",
): boolean {
  const t = (title ?? "").trim();
  const b = (body ?? "").trim();
  const pkg = (packageName ?? "").trim();
  if (!t && !b) return false;
  const combined = `${t} ${b}`;
  if (isWalletOrPayPackage(pkg)) {
    return !containsInsensitive(combined, STRONG_SPAM);
  }
  if (pkg === PLAY_STORE_PACKAGE) {
    if (containsInsensitive(combined, STRONG_SPAM)) return false;
    if (looksLikePlayStoreInstallOrDownloadOnly(combined, pkg)) return false;
    const money = hasAmountLike(t, b);
    if (money) return true;
    const purchase = containsInsensitive(combined, PLAY_PURCHASE_HINTS);
    const inc = containsInsensitive(combined, INCOME_HINTS);
    return purchase || inc;
  }
  if (looksLikePlayStoreInstallOrDownloadOnly(combined, pkg)) return false;
  const money = hasAmountLike(t, b);
  const spend = containsInsensitive(combined, SPEND_HINTS);
  const income = containsInsensitive(combined, INCOME_HINTS);
  const playW = containsInsensitive(combined, PLAY_WALLET_HINTS);
  const txLike = spend || income || playW;
  const spam = containsInsensitive(combined, STRONG_SPAM);
  if (money) return true;
  if (txLike) return true;
  if (spam) return false;
  return true;
}
