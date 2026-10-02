const NAME_KEY = "naiadex_username";

export function getUsername(): string | null {
  return localStorage.getItem(NAME_KEY);
}
export function setUsername(name: string): void {
  localStorage.setItem(NAME_KEY, name.trim());
}
export function clearUsername(): void {
  localStorage.removeItem(NAME_KEY);
}