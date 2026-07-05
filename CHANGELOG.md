# Changelog

## [Unreleased]

### Added
- 2026-06-29: Add DELETE endpoint for app_users removal (`DELETE /api/rbac/users/:appSlug/:sub`)
- 2026-06-29: Add "Remove" button in RBAC app Users table with confirmation dialog
- 2026-06-29: Add `deleteRbacUser()` to frontend API client
- 2026-06-29: Add bulk actions (checkboxes, select-all, bulk delete, bulk override role) to Users table in AppRoleDetail.jsx

### Changed
- 2026-06-29: Improve logger console transport to show metadata (error details now visible in console output)
- 2026-06-29: Restructure `syncUsersForApp()` to use explicit find-then-act pattern — always query existing user by OIDC sub before acting, skip users with failed resolveRole

### Fixed
- 2026-06-29: Fix `POST /api/rbac/sync/:appSlug` - replace non-existent Authentik API endpoints (`/groups/{pk}/users/`, `/users/{pk}/groups/`) with correct group/user detail endpoints using `users_obj`/`groups_obj` embedded fields
- 2026-06-29: Fix same Authentik API pattern in `getUserOgunRole()` for consistency
- 2026-06-29: Remove test users `test@example.com` and `test@test.com` from app_users across all apps
- 2026-06-29: Fix audit log tab for apps — pass `entity_type=rbac_app&entity_id=slug` instead of `entity_type=slug`
- 2026-06-29: Add missing `entity_id` filter to `getAuditLogs()` in auditService.js
