const KEY = "naiadex_admin_token";

export function getAdminToken(): string | null {
  return localStorage.getItem(KEY);
}
export function setAdminToken(token: string): void {
  localStorage.setItem(KEY, token.trim());
}
export function clearAdminToken(): void {
  localStorage.removeItem(KEY);
}
export function isAdmin(): boolean {
  return !!getAdminToken();
}