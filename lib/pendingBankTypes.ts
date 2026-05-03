/** Staging row from an Android bank app notification (before user saves as expense). */
export type PendingBankTransaction = {
  id: string;
  packageName: string;
  title: string;
  body: string;
  postedAtMs: number;
  createdAtMs: number;
};
