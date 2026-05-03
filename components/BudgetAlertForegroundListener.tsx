import { useContext, useEffect } from "react";
import { Alert, DeviceEventEmitter } from "react-native";
import { AppDialogContext } from "../context/AppDialogContext";
import {
  BUDGET_ALERT_FOREGROUND_EVENT,
  type BudgetAlertForegroundPayload,
} from "../lib/budgetAlertEvents";

/**
 * Uygulama öndeyken yerel push çoğu cihazda görünmez; bütçe uyarısı için standart uyarı diyaloğu gösterir.
 * `AppDialogProvider` dışında kalındığı nadir durumlarda sistem `Alert` ile yedeklenir (çökme olmaz).
 */
export default function BudgetAlertForegroundListener() {
  const dialog = useContext(AppDialogContext);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      BUDGET_ALERT_FOREGROUND_EVENT,
      (p: BudgetAlertForegroundPayload) => {
        if (!p?.title || !p?.body) return;
        if (dialog) dialog.showAlert(p.title, p.body);
        else Alert.alert(p.title, p.body);
      },
    );
    return () => sub.remove();
  }, [dialog]);

  return null;
}
