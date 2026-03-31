# STRIDE Threat Analysis Guide

For each category, consider the new feature as a whole and ask the guiding
questions. Not every category will have findings — that's normal.

## Spoofing (Identity)
**Question:** Can someone pretend to be someone else?
- Is authentication required for the new endpoints?
- Can session tokens be stolen or forged?
- Are API keys properly scoped and validated?
- Can email/identity verification be bypassed?

## Tampering (Data Integrity)
**Question:** Can data be modified without detection?
- Is input validated before processing?
- Are database writes protected by transactions?
- Can request parameters be manipulated to change behavior?
- Is there integrity checking on data at rest?

## Repudiation (Accountability)
**Question:** Can actions be performed without a trace?
- Are security-relevant actions logged?
- Do logs include who, what, when, and from where?
- Can logs be tampered with by users?
- Is there an audit trail for data modifications?

## Information Disclosure (Confidentiality)
**Question:** Can sensitive data be seen by unauthorized parties?
- Does the API return more data than the client needs?
- Are error messages revealing internal system details?
- Is sensitive data encrypted at rest and in transit?
- Can user A see user B's data through the new feature?

## Denial of Service (Availability)
**Question:** Can the feature be used to degrade or disrupt service?
- Is there rate limiting on resource-intensive operations?
- Can large inputs cause memory or CPU exhaustion?
- Are database queries bounded (no unbounded SELECTs)?
- Can file uploads fill disk space?

## Elevation of Privilege (Authorization)
**Question:** Can a user gain access they shouldn't have?
- Are authorization checks applied consistently?
- Can a regular user access admin functionality?
- Can horizontal privilege escalation occur (user A accessing user B's resources)?
- Are default permissions restrictive (deny by default)?
