package centifi.app

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class BankNotificationListener : NotificationListenerService() {

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val ctx = applicationContext ?: return
    val pkg = sbn.packageName ?: return
    if (!BankNotifPrefs.allowedPackages(ctx).contains(pkg)) return

    val extras = sbn.notification.extras
    val title =
      extras?.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
    var body =
      extras?.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
    if (body.isEmpty()) {
      body =
        extras?.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
    }
    if (title.isEmpty() && body.isEmpty()) return
    if (!BankNotificationSpendHeuristic.looksLikeSpendOrAccountMovement(title, body, pkg)) return

    val postTime = sbn.postTime
    val id = "${pkg}_${postTime}_${title.hashCode()}_${body.hashCode()}"

    val now = System.currentTimeMillis()
    val json =
      org.json.JSONObject().apply {
        put("id", id)
        put("packageName", pkg)
        put("title", title)
        put("body", body)
        put("postedAtMs", postTime)
        put("createdAtMs", now)
      }
    if (BankNotifPrefs.appendToQueue(ctx, json)) {
      BankPendingSystemNotification.maybeShow(ctx, title, body, id)
    }
  }
}
