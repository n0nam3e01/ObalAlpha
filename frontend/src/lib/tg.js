// Website mode: Telegram SDK is not used. These are safe no-op shims kept only
// so any lingering imports don't crash. New code should not import this file.

export const tg = null;
export function tgReady() {}
export function tgSetTheme() {}
export function tgBackButton() {}
export function tgMainButton() {}
export function tgMainButtonOff() {}
export function tgHapticImpact() {}
export function tgHapticSuccess() {}
export function tgOpenLink(url) { window.open(url, '_blank'); }
export function tgShowConfirm(message, cb) { cb(window.confirm(message)); }
export function tgRequestContact(cb) { cb(false); }
export function isInTelegram() { return false; }
