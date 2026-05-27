import { useTheme } from "../theme/ThemeContext";
import { useSettings } from "../theme/SettingsContext";

interface Props {
  onBack: () => void;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-4 border-b border-[var(--color-border)]">
      <div className="text-[var(--color-text-dim)] text-[11px] font-bold tracking-[1.2px] uppercase mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--color-accent)] text-[var(--color-panel)]"
                : "bg-[var(--color-panel-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text-strong)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        value ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-[var(--color-panel)] shadow transition-transform duration-200 ${
          value ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function SettingsPage({ onBack }: Props) {
  const { theme, toggle } = useTheme();
  const { settings, update } = useSettings();

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-0 h-14 border-b border-[var(--color-border)] bg-[var(--color-panel)]">
        <button
          type="button"
          onClick={onBack}
          className="text-[var(--color-accent)] text-3xl leading-none pb-0.5 hover:opacity-75 transition-opacity"
          aria-label="Back"
        >
          ‹
        </button>
        <h1 className="m-0 text-base font-semibold text-[var(--color-text-strong)]">
          Settings
        </h1>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <Section title="Theme">
          <Segmented
            value={theme}
            options={[
              { value: "dark", label: "☾ Dark" },
              { value: "light", label: "☀ Light" },
            ]}
            onChange={(t) => { if (t !== theme) toggle(); }}
          />
        </Section>

        <Section title="Text size">
          <Segmented
            value={settings.fontScale}
            options={[
              { value: 0.85, label: "S" },
              { value: 1.0, label: "M" },
              { value: 1.15, label: "L" },
              { value: 1.3, label: "XL" },
            ]}
            onChange={(fontScale) => update({ fontScale })}
          />
        </Section>

        <Section title="Auto-reveal Summary">
          <div className="flex items-center gap-3">
            <p className="m-0 flex-1 text-xs text-[var(--color-text-dim)] leading-4">
              Open Summary cards by default when you first visit a topic. Turn
              off for study mode — start with a blank reader and reveal each
              section as you go.
            </p>
            <Toggle
              value={settings.autoRevealSummary}
              onChange={(autoRevealSummary) => update({ autoRevealSummary })}
            />
          </div>
        </Section>

        <Section title="E-reader mode">
          <div className="flex items-center gap-3">
            <p className="m-0 flex-1 text-xs text-[var(--color-text-dim)] leading-4">
              Render section cards as flat drop-downs with high-contrast headers
              — no borders, no tinted backgrounds. Designed for e-ink screens
              where subtle colours wash out.
            </p>
            <Toggle
              value={settings.eReaderMode}
              onChange={(eReaderMode) => update({ eReaderMode })}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
