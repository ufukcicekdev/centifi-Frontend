/** DeviceEventEmitter name — uygulama öndeyken bütçe uyarısı için. */
export const BUDGET_ALERT_FOREGROUND_EVENT = "centifi_budget_foreground_alert";

export type BudgetAlertForegroundPayload = { title: string; body: string };
