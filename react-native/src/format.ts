const locale = 'en-US';

/** "Mar 2026" */
export const monthYear = (d: Date) => d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });

/** "Mar 12, 2026" */
export const shortDate = (d: Date) => d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });

/** "March 12, 2026" */
export const longDate = (d: Date) => d.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });

/** "Thursday, March 12, 2026" */
export const fullDate = (d: Date) =>
  d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

/** "9:15 AM" */
export const time = (d: Date) => d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });

/** "Mar 12, 2026 at 9:15 AM" */
export const dateTime = (d: Date) => `${shortDate(d)} at ${time(d)}`;

export const percent = (x: number) => `${Math.round(x * 100)}%`;

export function ageOn(dob: Date, on: Date): number {
  let age = on.getFullYear() - dob.getFullYear();
  const beforeBirthday = on.getMonth() < dob.getMonth() || (on.getMonth() === dob.getMonth() && on.getDate() < dob.getDate());
  if (beforeBirthday) age--;
  return age;
}

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
