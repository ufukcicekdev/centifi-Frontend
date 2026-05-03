package app.centifi

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Banka bildirimi kuyruğa eklendiğinde gösterilir; JS çalışmasa bile (uygulama arka planda)
 * kullanıcı Centifi’yi açıp bekleyen işlemi görebilsin.
 */
internal object BankPendingSystemNotification {
  private const val CHANNEL_ID = "centifi_bank_pending"
  private const val NOTIF_ID = 0x43454E46 // "CENF" — tek slot, hızlı tekrarlar üst üste binir

  private fun ensureChannel(ctx: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val ch = NotificationChannel(
      CHANNEL_ID,
      ctx.getString(R.string.bank_pending_channel_name),
      NotificationManager.IMPORTANCE_DEFAULT,
    ).apply {
      description = ctx.getString(R.string.bank_pending_channel_desc)
      setShowBadge(true)
    }
    nm.createNotificationChannel(ch)
  }

  fun maybeShow(context: Context, bankTitle: String, bankBody: String) {
    if (!BankNotifPrefs.systemNotificationEnabled(context)) return
    val nm = NotificationManagerCompat.from(context)
    if (!nm.areNotificationsEnabled()) return

    val ctx = context.applicationContext
    ensureChannel(ctx)

    val intent = Intent(ctx, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    val piFlags =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      } else {
        @Suppress("DEPRECATION")
        PendingIntent.FLAG_UPDATE_CURRENT
      }
    val pendingIntent = PendingIntent.getActivity(ctx, 0, intent, piFlags)

    val appName = ctx.getString(R.string.app_name)
    val combined = buildString {
      if (bankTitle.isNotEmpty()) {
        append(bankTitle)
      }
      if (bankTitle.isNotEmpty() && bankBody.isNotEmpty()) append("\n")
      if (bankBody.isNotEmpty()) {
        if (bankBody.length <= 400) append(bankBody) else append(bankBody.take(397)).append("…")
      }
    }.ifEmpty { ctx.getString(R.string.bank_pending_default_body) }

    val builder = NotificationCompat.Builder(ctx, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(appName)
      .setContentText(
        if (combined.length <= 200) combined else combined.take(197) + "…",
      )
      .setStyle(NotificationCompat.BigTextStyle().bigText(combined))
      .setContentIntent(pendingIntent)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setCategory(NotificationCompat.CATEGORY_STATUS)
      .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)

    try {
      nm.notify(NOTIF_ID, builder.build())
    } catch (_: SecurityException) {
      // POST_NOTIFICATIONS denied on API 33+
    }
  }
}
