# ChartLine Health (React Native)

A cross-platform port of the SwiftUI demo in `../ChartLine`, built with Expo and TypeScript. It runs on iOS, Android and the web from one codebase.

Every screen matches the iOS app: Overview, Records (with the consent-filtered "viewing as" switcher), Consent, Care (trend flags and booking) and the Employer portal. The synthetic workforce uses the same seeded generator, so the employer numbers are identical to the iOS demo. "Share with a doctor" builds the same health report as a PDF and hands it to the system share sheet.

All data is synthetic.

## Run it

Requires Node 20 or newer.

```bash
cd react-native
npm install
npx expo start        # then press i for the iOS simulator, a for Android, w for web
```

To try it on a phone without Xcode, install Expo Go and scan the QR code that `npx expo start` prints.

## Layout

```
App.tsx                  tab navigation
src/demoData.ts          synthetic patient, labs, visits and workforce
src/trendEngine.ts       least-squares trend flags
src/employerReport.ts    de-identified employer roll-up with small-cell suppression
src/store.tsx            consent grants, access log, appointments
src/screens/             the five tabs
src/report/              share-with-a-doctor sheet, preview and PDF HTML
```

## Checks

```bash
npm run typecheck
```
