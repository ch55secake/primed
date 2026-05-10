// Expo config plugin: patches MainActivity.kt to intercept hardware
// page-turn keys (Volume Up/Down, Page Up/Down, DPad arrows) before
// Android's audio system sees them, emit a "DrillyHardwareKey" event
// to JS, and consume the keypress.
//
// This is the only reliable way to map physical buttons to page nav:
// the volume-listener API only sees volume *changes*, can't distinguish
// our re-clamps from real presses, and stops firing once volume hits
// the min/max rail. On Boox Go 7 the OS already remaps volume buttons
// to PAGE_UP/PAGE_DOWN; intercepting both sets covers Boox + phones.
//
// Runs during `expo prebuild` so the patch survives android/ regeneration.

const { withMainActivity } = require("@expo/config-plugins");

const MARKER = "// drilly:hardware-key-intercept";

/** Inject the override + required imports. Idempotent. */
function injectIntercept(contents) {
  if (contents.includes(MARKER)) return contents; // already patched

  // 1. Imports
  const importBlock = [
    "import android.view.KeyEvent",
    "import com.facebook.react.ReactApplication",
    "import com.facebook.react.modules.core.DeviceEventManagerModule",
  ];
  for (const imp of importBlock) {
    if (!contents.includes(imp)) {
      contents = contents.replace(/^(package [^\n]+\n)/m, `$1\n${imp}\n`);
    }
  }

  // 2. dispatchKeyEvent override — added inside the class body, just
  //    before the closing brace.
  const override = `
  ${MARKER}
  // Hardware page-turn keys: Vol-Up / Vol-Down / Page-Up / Page-Down /
  // DPad arrows all become a single "DrillyHardwareKey" JS event with
  // direction = "next" | "prev". The keypress is consumed (return true)
  // so the audio system never lowers / raises volume, and the OS never
  // dispatches a duplicate page-up to fragments below us.
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (event.action == KeyEvent.ACTION_DOWN) {
      val direction: String? = when (event.keyCode) {
        KeyEvent.KEYCODE_VOLUME_DOWN,
        KeyEvent.KEYCODE_PAGE_DOWN,
        KeyEvent.KEYCODE_DPAD_DOWN,
        KeyEvent.KEYCODE_DPAD_RIGHT -> "next"
        KeyEvent.KEYCODE_VOLUME_UP,
        KeyEvent.KEYCODE_PAGE_UP,
        KeyEvent.KEYCODE_DPAD_UP,
        KeyEvent.KEYCODE_DPAD_LEFT -> "prev"
        else -> null
      }
      if (direction != null) {
        val ctx = (application as? ReactApplication)?.reactHost?.currentReactContext
        if (ctx != null) {
          ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("DrillyHardwareKey", direction)
          return true
        }
      }
    }
    return super.dispatchKeyEvent(event)
  }
`;

  // Insert before the final closing brace of the class. MainActivity.kt
  // ends in a single trailing "}" — match the last one.
  contents = contents.replace(/\n\}\s*$/, `\n${override}\n}\n`);
  return contents;
}

const withHardwareKeyIntercept = (config) =>
  withMainActivity(config, (cfg) => {
    cfg.modResults.contents = injectIntercept(cfg.modResults.contents);
    return cfg;
  });

module.exports = withHardwareKeyIntercept;
