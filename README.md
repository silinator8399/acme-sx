# ACME-SX

A lightweight TypeScript ACME client for issuing and storing TLS certificates via Let's Encrypt.

It supports:

- **Managed mode**: this package starts an HTTP challenge server for you.
- **Self-hosted mode**: you provide the challenge directory and serve files yourself.
- **PEM → PFX conversion**: convert generated PEM certificate/key files into a `.pfx` bundle.

---

## Features

- ACME account creation/reuse
- Automatic CSR generation
- HTTP-01 challenge handling
- Certificate + private key storage
- PEM to PFX conversion (`convertToPFX`)
- Typed event system for logs/errors
- TypeScript-first API

---

## Installation

```bash
npm install acme-sx
```

For local development in this repository:

```bash
npm install
```

---

## Quick Start

### 1) Import and create a client

```ts
import {
  ACMEClientSX,
  HOSTED_TYPE,
  ACMEEvents,
  ACMEEvent,
  IssueCertificateOptions,
  ACMEResponse,
  ACMEStoreResult
} from "acme-sx";
// local dev alternative: from "./src/main"
```

### 2) Optional: subscribe to events

```ts
ACMEEvents.on("log", (event: ACMEEvent<"log">) => {
  console.log(`[${event.timestamp.toISOString()}] ${event.message}`);
});

ACMEEvents.on("error", (event: ACMEEvent<"error">) => {
  console.error(`[${event.timestamp.toISOString()}] ${event.message}`);
});
```

### 3) Initialize client

#### Managed mode (package serves `/.well-known/acme-challenge` itself)

```ts
const client = new ACMEClientSX({
  staging: true, // use Let's Encrypt staging for tests
  hosted: HOSTED_TYPE.MANAGED
});
```

#### Self-hosted mode (you serve challenge files)

```ts
const client = new ACMEClientSX({
  staging: true,
  hosted: HOSTED_TYPE.SELF,
  challengeDirectory: "/var/www/.well-known/acme-challenge"
});
```

### 4) Test challenge reachability

```ts
const reachability = await client.testChallengeReachability("example.com");
console.log(reachability);
```

### 5) Issue certificate

```ts
const options: IssueCertificateOptions = {
  email: "admin@example.com",
  domain: "example.com",
  certificateStorePath: "./certificates",
  agreedTermsOfService: true,
  challengeType: "http-01"
};

const result: ACMEResponse<ACMEStoreResult> = await client.issueCertificate(options);

if (result.success) {
  console.log("Certificate stored:", result.data);
} else {
  console.error("Issuing failed:", result.error);
}
```

### 6) Convert PEM certificate/key to PFX

```ts
const pfxResult: ACMEResponse<string> = await ACMEClientSX.convertToPFX({
  certPemPath: "./certificates/example.com-cert.pem",
  keyPemPath: "./certificates/example.com-key.pem",
  domain: "example.com",
  passphrase: "change-me"
});

if (pfxResult.success) {
  console.log("PFX created at:", pfxResult.data);
} else {
  console.error("PFX conversion failed:", pfxResult.error);
}
```

---

## API Overview

### `new ACMEClientSX(options)`

`options`:

- `staging?: boolean` (default: `false`)
- `hosted: HOSTED_TYPE.MANAGED | HOSTED_TYPE.SELF`
- `challengeDirectory: string` (required for `SELF`)

### `testChallengeReachability(domain: string)`

Checks whether the HTTP challenge endpoint is publicly reachable and returns `ACMEResponse`.

### `issueCertificate(options: IssueCertificateOptions)`

Issues a certificate and stores:

- `${domain}-cert.pem`
- `${domain}-key.pem`
- `account-key.pem` (for account reuse)

Returns `ACMEResponse<ACMEStoreResult>`.

### `ACMEClientSX.convertToPFX(options)`

Converts existing PEM certificate/key files into a PFX file.

`options`:

- `certPemPath: string` – path to certificate PEM
- `keyPemPath: string` – path to private key PEM
- `domain: string` – used for output naming
- `passphrase: string` – password for resulting PFX

Returns `ACMEResponse<string>` where `data` is the created PFX path.

---

## Important Notes

- **Port 80 is required** for HTTP-01 challenge.
- Your domain must resolve to the machine running this flow.
- Use `staging: true` while testing to avoid Let's Encrypt rate limits.
- In managed mode, the package uses a local `./acme-challenges` directory.
- Store your PFX passphrase securely (e.g., environment variables / secrets manager).

---

## License

MIT