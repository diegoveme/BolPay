# BolPay mobile

Flutter client for the BolPay freelance-escrow platform. It talks to the same
backend as the web app and aims for feature parity: authentication, contracts
and milestones, deliverables, disputes, payroll cycles, escrow status, the admin
views and live notifications.

## Prerequisites

- Flutter 3.44+ (Dart SDK ^3.12.1)
- A running BolPay backend (see `apps/backend`)

## Running against the backend

The app reads its configuration from `--dart-define` flags at build/run time.
On the Android emulator the host machine is reachable at `10.0.2.2`, which is the
default for `API_URL`:

```bash
flutter run \
  --dart-define=API_URL=http://10.0.2.2:3000/api \
  --dart-define=POLLAR_PUBLISHABLE_KEY=your_publishable_key \
  --dart-define=POLLAR_API_URL=https://api.pollar.example \
  --dart-define=POLLAR_ALLOWED_ORIGIN=https://your.allowed.origin \
  --dart-define=STELLAR_NETWORK=testnet
```

Adjust the values for your environment. On a physical device, replace
`10.0.2.2` with your machine's LAN IP.

## Tests

```bash
flutter test
```

## Release builds

Release builds require `android/key.properties` (see
`android/key.properties.example`) and enforce https for network traffic.
