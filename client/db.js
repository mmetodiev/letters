import { init } from "@instantdb/core";

const APP_ID =
  typeof __INSTANT_APP_ID__ !== "undefined" ? __INSTANT_APP_ID__ : "";

export const db = APP_ID.length > 0 ? init({ appId: APP_ID }) : null;

export function hasInstant() {
  return Boolean(db);
}
