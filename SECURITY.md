# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting feature for this repository instead.

Include the affected endpoint or component, reproducible steps, expected security impact, and sanitized evidence. Never include Pi access tokens, cookies, credentials, private identifiers, or production database contents.

This portfolio application verifies Pi identity server-side, but game scores remain client-authoritative. That documented trust limitation is not, by itself, a vulnerability. Reports showing a way to bypass authentication, expose private identity data, access credentials, or compromise the service are especially valuable.
