/** Varsayılan liste adı — backend `signals` / migration ile oluşturulur. */
export const BACKEND_DEFAULT_PRIVATE_LIST_NAME = "Private list";

/** Sunucudan gelen varsayılan İngilizce adı seçilen dile çevirir. */
export function displayExpenseListName(name: string, t: (key: string) => string): string {
  if (name.trim() === BACKEND_DEFAULT_PRIVATE_LIST_NAME) {
    return t("lists.defaultPrivateList");
  }
  return name;
}
