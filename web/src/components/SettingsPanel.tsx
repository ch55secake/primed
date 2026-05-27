import { useTheme } from "../theme/ThemeContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: Props) {
  const { theme, toggle } = useTheme();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 z-60 bg-[var(--color-panel)] border-l border-[var(--color-border)] flex flex-col transform transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ zIndex: 60 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border)]">
          <h2 className="m-0 text-base font-semibold text-[var(--color-text-strong)]">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="btn !px-2 !py-1.5 text-base leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Theme */}
          <div className="px-4 py-4 border-b border-[var(--color-border)]">
            <div className="text-[var(--color-text-dim)] text-[11px] font-bold tracking-[1.2px] uppercase mb-3">
              Theme
            </div>
            <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { if (theme !== t) toggle(); }}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors capitalize ${
                    theme === t
                      ? "bg-[var(--color-accent)] text-[var(--color-panel)]"
                      : "bg-[var(--color-panel-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text-strong)]"
                  }`}
                >
                  {t === "dark" ? "☾ Dark" : "☀ Light"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
