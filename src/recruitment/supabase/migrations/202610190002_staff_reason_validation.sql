-- Enforce nonblank reasons even when a caller bypasses the application validator.
-- A separate migration preserves the already shared/applied staff migration.
alter table public.staff_access_history add constraint staff_reason_nonblank
  check (reason ~ '[^[:space:]]');
