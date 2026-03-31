# OWASP Top 10 — Code Patterns to Check

## A01: Broken Access Control
- Missing authentication middleware on endpoints
- Direct object references without ownership checks (e.g., `/api/users/:id` without verifying the requesting user owns that resource)
- Missing role/permission checks on admin endpoints
- CORS misconfiguration allowing any origin

## A02: Cryptographic Failures
- Passwords stored in plaintext or with weak hashing (MD5, SHA1)
- Hardcoded encryption keys or secrets
- Using HTTP instead of HTTPS for sensitive data
- Sensitive data in URL parameters (logged by proxies)

## A03: Injection
- String concatenation in SQL queries instead of parameterized queries
- User input passed to `eval()`, `exec()`, `child_process.exec()`
- Template injection in user-facing content
- NoSQL injection via unvalidated query operators (`$gt`, `$ne`)

## A04: Insecure Design
- No rate limiting on authentication or data modification endpoints
- Missing CSRF protection on state-changing operations
- No input size limits on file uploads or text fields
- Business logic that doesn't validate state transitions

## A05: Security Misconfiguration
- Debug/development mode enabled in production config
- Default credentials or API keys
- Stack traces exposed in error responses
- Overly permissive file permissions
- Unnecessary HTTP methods enabled

## A06: Vulnerable Components
- Known-vulnerable package versions (check CVE databases)
- Outdated dependencies with security patches available
- Unused dependencies increasing attack surface

## A07: Authentication Failures
- No account lockout after failed attempts
- Session tokens that don't expire
- Credentials sent over unencrypted channels
- Missing multi-factor authentication on sensitive operations

## A08: Data Integrity Failures
- Software updates without signature verification
- Insecure deserialization of user-controlled data
- CI/CD pipeline without integrity checks

## A09: Logging Failures
- Sensitive data (passwords, tokens, PII) in logs
- Missing audit logging for security-relevant events
- Log injection via unsanitized user input in log messages

## A10: SSRF
- User-controlled URLs fetched by the server without validation
- Internal service endpoints accessible via URL manipulation
- DNS rebinding vulnerabilities
