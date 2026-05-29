# Security Checklist

- [ ] All endpoints enforce family-level access control
- [ ] Setup token required for first admin bootstrap
- [ ] Password hashes are salted and never logged
- [ ] Telegram account linking uses expiring one-time code
- [ ] No secrets committed to repository
- [ ] Upload endpoint validates mime type and max size
- [ ] Audit log exists for event edits and deletions
- [ ] Backups are encrypted at rest/offsite when available
- [ ] Restore drill completed and documented
