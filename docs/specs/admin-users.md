# Admin user management (/admin/users)

- List all users with search (email/ID) and filters (role incl. superadmin, shop, status); counts for platform admins, superadmins, owners, staff, total (+suspended).
- Detail page `/admin/users/[id]` with actions (confirm dialog for every dangerous action).
- Superadmin = `users.is_superadmin` (migration 0019), only meaningful on `platform_admin`.
- Guards (server-side, `AdminUserManagementUseCase`):
  - Superadmin cannot be suspended or demoted; self-suspend/self-demote refused.
  - At least one active superadmin must always exist (atomic conditional UPDATE).
  - Only a superadmin can promote/demote platform admin, grant/revoke superadmin, or suspend/activate another platform admin.
  - Any platform admin can suspend/activate shop users and switch owner <-> staff (staff requires a branch of the same shop).
  - No hard delete; suspend revokes all the user's sessions; promote/demote also revokes sessions.
- Every change is audit-logged (user_suspended, user_activated, user_role_changed, platform_admin_granted/revoked, superadmin_granted/revoked) with before/after.
- Initial superadmin: admin@easyorder.test (set on staging only; prod needs migration 0019 + the same UPDATE).
