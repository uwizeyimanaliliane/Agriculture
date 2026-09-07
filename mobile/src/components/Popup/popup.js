let showFn = null;

export function registerPopup(fn) {
  showFn = fn;
  return () => {
    if (showFn === fn) showFn = null;
  };
}

export function isPopupReady() {
  return typeof showFn === 'function';
}

/**
 * Show a popup dialog.
 * options: { title, message, buttons: [{ text, style, onPress }] }
 * If no buttons given, a default "OK" button closes the popup.
 */
export function showPopup(options) {
  const opts = options || {};
  if (isPopupReady()) {
    showFn({
      title: opts.title || '',
      message: opts.message || '',
      buttons: Array.isArray(opts.buttons) && opts.buttons.length
        ? opts.buttons
        : [{ text: 'OK', onPress: undefined }],
    });
    return;
  }

  // Fallback if the popup provider is not mounted yet.
  const text = [opts.title, opts.message].filter(Boolean).join('\n') || '';
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(text);
  } else if (typeof alert === 'function') {
    alert(text);
  }
}

/**
 * Confirm dialog using the popup. Resolves true/false.
 */
export function confirmPopup(options) {
  return new Promise((resolve) => {
    const opts = options || {};
    const confirmText = opts.confirmText || 'Confirm';
    const cancelText = opts.cancelText || 'Cancel';
    showPopup({
      title: opts.title || '',
      message: opts.message || '',
      buttons: [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: 'default', onPress: () => resolve(true) },
      ],
    });
  });
}
