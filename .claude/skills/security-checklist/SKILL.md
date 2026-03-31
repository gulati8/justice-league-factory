---
name: security-checklist
description: >
  Security review methodology using OWASP Top 10 and STRIDE frameworks.
  Reference material for scanning code changes for vulnerabilities.
  Injected into Green Lantern's context.
user-invocable: false
disable-model-invocation: true
---

# Security Checklist

This guides your security review methodology. You scan new/changed code for
vulnerabilities using two frameworks: OWASP Top 10 (specific vulnerability
categories) and STRIDE (threat modeling).

## Review Scope

Focus on code that was created or modified in this factory run. Use Cyborg's
briefings (`artifacts/briefings/cyborg-*.json`) to identify which files changed.
Don't audit the entire codebase — that's noise, not signal.

For each changed file, assess:
- Does it handle user input?
- Does it interact with databases, filesystems, or external services?
- Does it handle authentication or authorization?
- Does it expose data to the client?

Files that do none of these are low-risk. Spend your time on the ones that do.

## OWASP Top 10 Scan

For each category, check the changed code for common patterns. See
[references/owasp-top-10.md](references/owasp-top-10.md) for detailed patterns
to look for in each category.

Quick reference:
- **A01: Broken Access Control** — Missing auth checks, IDOR, privilege escalation
- **A02: Cryptographic Failures** — Weak algorithms, hardcoded keys, plaintext storage
- **A03: Injection** — SQL, NoSQL, OS command, LDAP injection
- **A04: Insecure Design** — Missing rate limiting, no abuse controls
- **A05: Security Misconfiguration** — Debug mode, default credentials, overly permissive CORS
- **A06: Vulnerable Components** — Known-vulnerable dependencies
- **A07: Auth Failures** — Weak password rules, missing brute-force protection
- **A08: Data Integrity** — Unsigned updates, insecure deserialization
- **A09: Logging Failures** — Missing audit logs, logging sensitive data
- **A10: SSRF** — Unvalidated URL fetching, internal service access

## STRIDE Threat Analysis

For the feature as a whole, consider each STRIDE category. See
[references/stride.md](references/stride.md) for detailed guidance.

- **Spoofing** — Can an attacker pretend to be someone else?
- **Tampering** — Can data be modified in transit or at rest?
- **Repudiation** — Can actions be performed without accountability?
- **Information Disclosure** — Can sensitive data leak?
- **Denial of Service** — Can the feature be abused to degrade service?
- **Elevation of Privilege** — Can a user gain unauthorized access?

## Secrets Scan

Grep for common secret patterns in changed files:
- API keys, tokens, passwords in code or config
- Private keys, certificates
- Connection strings with credentials
- Patterns: `password=`, `secret=`, `api_key=`, `token=`, `-----BEGIN`

## Output Field Names

Your output JSON MUST use these exact field names to pass schema validation:

```json
{
  "verdict": "pass",
  "summary": "...",
  "owasp_findings": [],
  "stride_analysis": {
    "spoofing": [],
    "tampering": [],
    "repudiation": [],
    "information_disclosure": [],
    "denial_of_service": [],
    "elevation_of_privilege": []
  },
  "secrets_scan": {
    "clean": true,
    "findings": []
  }
}
```

Do NOT use alternative names like `findings`, `owasp_check`, or `owasp_results`.
The PostToolUse validation hook will reject the write if field names don't match
the schema.

## Severity Guide

- **Critical:** Exploitable vulnerability with direct impact (SQL injection,
  exposed credentials, missing auth on sensitive endpoint)
- **High:** Vulnerability that requires some conditions to exploit but would
  have significant impact
- **Medium:** Security weakness that should be addressed but isn't immediately
  exploitable
- **Low:** Best practice violation with minimal direct risk

Only critical and high cause a "fail" verdict.
