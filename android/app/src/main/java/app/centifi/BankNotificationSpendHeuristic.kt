package centifi.app

import java.util.regex.Pattern

/**
 * Banka / Google Play / Google Wallet: harcama veya gelir ihtimali.
 * **Google Play uygulaması** (`com.android.vending`): yalnızca tutar + satın alma/abonelik metni + gelir listesi (iade);
 * kurulum/indirme kalıpları elenir — bankadan gelen Play harcaması bu paketten değil, banka kuralından geçer.
 * Wallet/Pay: güçlü OTP dışında kabul. Diğer paketlerde belirsiz metin geçirilir.
 */
internal object BankNotificationSpendHeuristic {

  private val amountPattern: Pattern =
    Pattern.compile(
      "(" +
        "[₺€\\u0024£]\\s*\\d[\\d.'\\s]*([.,]\\d{1,2})?|" +
        "\\d[\\d.'\\s]*[.,]\\d{2}\\s*([₺€\\u0024£]|\\bTL\\b|\\bTRY\\b|\\bEUR\\b|\\bUSD\\b|\\bGBP\\b)|" +
        "\\b(TL|TRY|EUR|USD|GBP)\\s*\\d|" +
        "\\b\\d{1,3}([.'\\s]\\d{3})*[.,]\\d{2}\\b" +
        ")",
      Pattern.CASE_INSENSITIVE,
    )

  /** Play Store "12.50 MB" / % indirme gibi metinler tutarı tetiklemesin. */
  private val scrubFileSizeAndPercent: Pattern =
    Pattern.compile(
      "\\d[\\d.,'\\s]{0,14}\\s*(?:mb|mib|gb|gib|kb|kib)(?:\\s*/\\s*s)?\\b" +
        "|\\d[\\d.,'\\s]{0,14}\\s*%+\\b" +
        "|\\d[\\d.,'\\s]*[.,]\\d{2}\\s*%+\\b",
      Pattern.CASE_INSENSITIVE,
    )

  private val playContextSnippets: Array<String> =
    arrayOf(
      "google play",
      "play store",
      "google play store",
      "play yükle",
      "tienda google play",
      "boutique google play",
    )

  /** Yalnızca uygulama indirme/kurulum/güncelleme — satın alma değil (en/tr/de/fr/es). */
  private val playNonPurchaseSnippets: Array<String> =
    arrayOf(
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
    )

  /**
   * Yalnızca Google Play **satın alma / abonelik / fatura** metinleri.
   * `com.android.vending` paketinde kabul: tutar VEYA bu liste VEYA [incomeSnippets] (iade) — kurulum/güncelleme ayrıca elenir.
   * Uygulama i18n’i en/tr/de/fr/es olsa da Play bildirimi cihaz diline göre gelebilir; bu yüzden ek diller dahil.
   */
  private val playPurchaseSnippets: Array<String> =
    arrayOf(
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
    )

  /** İşlem dışı: OTP, şifre, anket daveti, çekiliş — geniş "kampanya" yok. */
  private val strongSpamSnippets: Array<String> =
    arrayOf(
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
    )

  private val spendSnippets: Array<String> =
    arrayOf(
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
    )

  private val incomeSnippets: Array<String> =
    arrayOf(
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
    )

  /**
   * Google Play / Wallet / Pay işlem ipuçları (desteklenen diller: en, tr, de, fr, es).
   */
  private val playWalletSnippets: Array<String> =
    arrayOf(
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
      "moyen de paiement",
      "zahlungsmittel",
      "billing",
      "facturation",
      "abonnement",
      "facture google play",
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
    )

  private val walletPayPackages: Set<String> =
    setOf(
      "com.google.android.apps.walletnfcrel",
      "com.google.android.apps.pay",
    )

  private fun isWalletOrPayPackage(packageName: String): Boolean =
    packageName in walletPayPackages

  private fun containsInsensitive(combined: String, snippets: Array<String>): Boolean {
    for (s in snippets) {
      if (combined.contains(s, ignoreCase = true)) return true
    }
    return false
  }

  private fun scrubSizesAndPercents(text: String): String {
    val m = scrubFileSizeAndPercent.matcher(text)
    val sb = StringBuffer()
    while (m.find()) {
      m.appendReplacement(sb, " ")
    }
    m.appendTail(sb)
    return sb.toString()
  }

  private fun hasAmountLike(title: String, body: String): Boolean {
    val scrubbed = scrubSizesAndPercents("$title $body")
    return amountPattern.matcher(scrubbed).find()
  }

  private fun hasPlayStoreContext(combined: String): Boolean =
    containsInsensitive(combined, playContextSnippets)

  private fun isPlayStorePackage(packageName: String): Boolean =
    packageName == "com.android.vending"

  private fun looksLikePlayStoreInstallOrDownloadOnly(combined: String, packageName: String): Boolean {
    if (containsInsensitive(combined, playPurchaseSnippets)) return false
    if (!containsInsensitive(combined, playNonPurchaseSnippets)) return false
    return hasPlayStoreContext(combined) || isPlayStorePackage(packageName)
  }

  fun looksLikeSpendOrAccountMovement(title: String, body: String, packageName: String = ""): Boolean {
    if (title.isBlank() && body.isBlank()) return false
    val combined = "$title $body"
    if (isWalletOrPayPackage(packageName)) {
      val spam = containsInsensitive(combined, strongSpamSnippets)
      return !spam
    }
    if (isPlayStorePackage(packageName)) {
      val spam = containsInsensitive(combined, strongSpamSnippets)
      if (spam) return false
      if (looksLikePlayStoreInstallOrDownloadOnly(combined, packageName)) return false
      val money = hasAmountLike(title, body)
      if (money) return true
      val purchase = containsInsensitive(combined, playPurchaseSnippets)
      val inc = containsInsensitive(combined, incomeSnippets)
      return purchase || inc
    }
    if (looksLikePlayStoreInstallOrDownloadOnly(combined, packageName)) return false
    val money = hasAmountLike(title, body)
    val spend = containsInsensitive(combined, spendSnippets)
    val income = containsInsensitive(combined, incomeSnippets)
    val playW = containsInsensitive(combined, playWalletSnippets)
    val txLike = spend || income || playW
    val spam = containsInsensitive(combined, strongSpamSnippets)
    if (money) return true
    if (txLike) return true
    if (spam) return false
    return true
  }
}
