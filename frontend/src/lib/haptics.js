// Web haptics via the Vibration API. No-ops gracefully where unsupported
// (most desktops, iOS Safari). Used on reserve + pickup confirmations.

function vibrate(pattern) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

export function hapticImpact() {
  vibrate(15);
}

export function hapticSuccess() {
  vibrate([20, 40, 20]);
}

export function hapticError() {
  vibrate([40, 30, 40, 30, 40]);
}
