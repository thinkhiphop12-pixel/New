'use client';

import styles from './Meter.module.css';

export type MeterBand = 'abysmal' | 'poor' | 'okay' | 'good' | 'excellent';

/** Buckets a 0-100 value into a five-band scale: 0-19 / 20-39 / 40-59 / 60-79 / 80-100. */
export function bandFor(value: number): MeterBand {
  if (value < 20) return 'abysmal';
  if (value < 40) return 'poor';
  if (value < 60) return 'okay';
  if (value < 80) return 'good';
  return 'excellent';
}

export function bandLabel(band: MeterBand): string {
  switch (band) {
    case 'abysmal': return 'Abysmal';
    case 'poor': return 'Poor';
    case 'okay': return 'Okay';
    case 'good': return 'Good';
    case 'excellent': return 'Excellent';
  }
}

const BAND_CLASS: Record<MeterBand, string> = {
  abysmal: styles.red,
  poor: styles.red,
  okay: styles.gold,
  good: styles.green,
  excellent: styles.green,
};

/** Compact labelled meter: value, band name and a filled 0-100 track. */
export default function Meter({
  label,
  value,
  display,
  band,
}: {
  label: string;
  value: number;
  display?: string;
  band?: MeterBand;
}) {
  const resolvedBand = band ?? bandFor(value);
  const bandClass = BAND_CLASS[resolvedBand];
  const pct = Math.max(0, Math.min(100, value));

  // When `display` overrides the printed value (e.g. money), the value is no
  // longer a 0-100 quantity, so this isn't a true `role="meter"` widget —
  // that role requires the number to be meaningful on the given min/max
  // scale (per WAI-ARIA). We still render the same visual, but drop the
  // meter role/aria-value* trio and fall back to a labelled group instead,
  // so screen readers don't announce a nonsensical percentage.
  const isMeter = display === undefined;

  return (
    <div
      className={styles.meter}
      {...(isMeter
        ? {
            role: 'meter',
            'aria-valuenow': value,
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuetext': bandLabel(resolvedBand),
            'aria-label': label,
          }
        : { role: 'group', 'aria-label': `${label}: ${display}, ${bandLabel(resolvedBand)}` })}
    >
      <div className={styles.row}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{display ?? value}</span>
        <span className={`${styles.bandName} ${bandClass}`}>{bandLabel(resolvedBand)}</span>
      </div>
      <div className={styles.track}>
        <div className={`${styles.fill} ${bandClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
