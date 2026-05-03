package app.centifi

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

internal object BankNotifPrefs {
  const val PREF_NAME = "centifi_bank_notifications"
  const val KEY_ALLOWED = "allowed_packages_json"
  const val KEY_QUEUE = "pending_native_queue_json"
  /** Uygulama içi “Bildirimleri aç” ile senkron; kapalıysa OS bildirimi göstermeyiz. */
  const val KEY_SYSTEM_NOTIF_ENABLED = "bank_system_notif_enabled"
  const val ACTION_QUEUE_UPDATED = "app.centifi.BANK_PENDING_QUEUE_UPDATED"

  fun allowedPackages(ctx: Context): Set<String> {
    val prefs = ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    val raw = prefs.getString(KEY_ALLOWED, "[]") ?: "[]"
    return try {
      val arr = JSONArray(raw)
      buildSet {
        for (i in 0 until arr.length()) {
          val s = arr.optString(i, "").trim()
          if (s.isNotEmpty()) add(s)
        }
      }
    } catch (_: Exception) {
      emptySet()
    }
  }

  fun systemNotificationEnabled(ctx: Context): Boolean {
    val prefs = ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    return prefs.getBoolean(KEY_SYSTEM_NOTIF_ENABLED, true)
  }

  fun setSystemNotificationEnabled(ctx: Context, enabled: Boolean) {
    ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE).edit()
      .putBoolean(KEY_SYSTEM_NOTIF_ENABLED, enabled)
      .apply()
  }

  /** @return true if a new row was appended (not a duplicate id). */
  fun appendToQueue(ctx: Context, item: JSONObject): Boolean {
    val prefs = ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    val raw = prefs.getString(KEY_QUEUE, "[]") ?: "[]"
    val arr = try {
      JSONArray(raw)
    } catch (_: Exception) {
      JSONArray()
    }
    val id = item.optString("id", "")
    if (id.isEmpty()) return false
    for (i in 0 until arr.length()) {
      val o = arr.optJSONObject(i) ?: continue
      if (id == o.optString("id", "")) return false
    }
    arr.put(item)
    while (arr.length() > 80) {
      arr.remove(0)
    }
    prefs.edit().putString(KEY_QUEUE, arr.toString()).apply()
    val launch = android.content.Intent(ACTION_QUEUE_UPDATED)
    launch.setPackage(ctx.packageName)
    ctx.sendBroadcast(launch)
    return true
  }
}
