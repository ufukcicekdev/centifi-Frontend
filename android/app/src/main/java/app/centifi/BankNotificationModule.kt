package centifi.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray

class BankNotificationModule(private val reactCtx: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactCtx) {

  private val receiver =
    object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        emitUpdated()
      }
    }

  override fun getName(): String = MODULE_NAME

  override fun initialize() {
    super.initialize()
    val filter = IntentFilter(BankNotifPrefs.ACTION_QUEUE_UPDATED)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      reactCtx.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("DEPRECATION")
      reactCtx.registerReceiver(receiver, filter)
    }
  }

  override fun invalidate() {
    try {
      reactCtx.unregisterReceiver(receiver)
    } catch (_: Exception) {
    }
    super.invalidate()
  }

  private fun emitUpdated() {
    try {
      reactCtx
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(EVENT_NAME, Arguments.createMap())
    } catch (_: Exception) {
    }
  }

  @ReactMethod
  fun syncBankSystemNotificationEnabled(enabled: Boolean, promise: Promise) {
    try {
      BankNotifPrefs.setSystemNotificationEnabled(reactCtx, enabled)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_SYNC_NOTIF", e.message, e)
    }
  }

  @ReactMethod
  fun syncAllowedPackagesJson(json: String, promise: Promise) {
    try {
      JSONArray(json) // validate
      reactCtx
        .getSharedPreferences(BankNotifPrefs.PREF_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(BankNotifPrefs.KEY_ALLOWED, json)
        .apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_SYNC", e.message, e)
    }
  }

  @ReactMethod
  fun drainPendingQueueJson(promise: Promise) {
    try {
      val prefs = reactCtx.getSharedPreferences(BankNotifPrefs.PREF_NAME, Context.MODE_PRIVATE)
      val raw = prefs.getString(BankNotifPrefs.KEY_QUEUE, "[]") ?: "[]"
      prefs.edit().putString(BankNotifPrefs.KEY_QUEUE, "[]").apply()
      promise.resolve(raw)
    } catch (e: Exception) {
      promise.reject("E_DRAIN", e.message, e)
    }
  }

  @ReactMethod
  fun isNotificationListenerEnabled(promise: Promise) {
    try {
      val cn = android.content.ComponentName(reactCtx, BankNotificationListener::class.java)
      val flat = Settings.Secure.getString(reactCtx.contentResolver, "enabled_notification_listeners")
      val ok =
        !TextUtils.isEmpty(flat) &&
          flat.split(":").toTypedArray().any { item ->
            android.content.ComponentName.unflattenFromString(item)?.flattenToString() ==
              cn.flattenToString()
          }
      promise.resolve(ok)
    } catch (e: Exception) {
      promise.reject("E_LISTENER", e.message, e)
    }
  }

  @ReactMethod
  fun openNotificationListenerSettings() {
    val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactCtx.startActivity(intent)
  }

  companion object {
    const val MODULE_NAME = "BankNotificationModule"
    const val EVENT_NAME = "CentifiBankPendingUpdated"
  }
}
