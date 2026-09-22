export function getAppUrl() {
  return (import.meta.env.WXT_APP_URL || "http://localhost:3001").replace(
    /\/$/,
    ""
  );
}
