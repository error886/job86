# Security Specification for 86Job Firestore Database

## 1. Data Invariants
- **User Integrity**: A user profile can only be created with an ID matching their authenticated `request.auth.uid`. A user's `role` cannot be modified except by admins.
- **Job Integrity**: A job must contain valid coordinates, non-negative salary, and correct structure. Only authenticated users can submit a job (which defaults to 'pending' status). Only admins can approve or reject jobs.
- **Bookmark Integrity**: Bookmarks can only be created by the user they belong to. They must associate a valid user and job.
- **Log Integrity**: Crawler logs are read-only for regular users and can only be written by background parser integrations.

## 2. The "Dirty Dozen" Payloads (Vulnerability Scenarios)
1. **Identity Spoofing**: Attempt to create user profile `u_other` while authenticated as `u1`.
2. **Self-Elevating Role**: User trying to write `{ "role": "admin" }` to their own profile.
3. **Ghost Fields injection**: Attempting to insert unvalidated fields into job doc `{ "title": "Job", ..., "shadowField": true }`.
4. **ID Poisoning**: Request with document ID exceeding 128 characters or using special symbols.
5. **PII Blanket Leak**: Guest trying to read a profile's private attributes.
6. **Query Scraping**: Client executing blanket list queries without passing matching parameters.
7. **Negative/Insane Salary**: Creating a job with a salary of `-100` or `100000000`.
8. **Bypassing Review State**: Creating a job directly with `status: "approved"` to bypass admin moderation.
9. **Spam views increment**: Directly writing arbitrary numbers to the `views` field on a job doc.
10. **Bookmark Hijacking**: User `u1` trying to bookmark on behalf of user `u2`.
11. **Log Manipulation**: Deleting or editing historic parsing logs to hide scraping failures.
12. **Malicious Coordinates**: Posting jobs with coordinates out of bounds.

## 3. Test Cases Spec
All payloads listed above must return `PERMISSION_DENIED` under the generated rules.
