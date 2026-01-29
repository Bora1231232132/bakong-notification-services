import { UserRole } from '@bakong/shared'

/**
 * Permission utility functions for role-based access control
 */

export interface PermissionCheck {
  canCreateTemplates: boolean
  canEditTemplates: boolean
  canDeleteTemplates: boolean
  canApproveTemplates: boolean
  canSendNotifications: boolean
  canManageCategoryTypes: boolean
  canViewCategoryTypes: boolean
  canManageUsers: boolean
  canViewUsers: boolean
}

/**
 * Get permission checks for a given role
 */
export function getPermissions(role: UserRole | undefined): PermissionCheck {
  if (!role) {
    return {
      canCreateTemplates: false,
      canEditTemplates: false,
      canDeleteTemplates: false,
      canApproveTemplates: false,
      canSendNotifications: false,
      canManageCategoryTypes: false,
      canViewCategoryTypes: false,
      canManageUsers: false,
      canViewUsers: false,
    }
  }

  switch (role) {
    case UserRole.ADMINISTRATOR:
      return {
        canCreateTemplates: true,
        canEditTemplates: true,
        canDeleteTemplates: true,
        canApproveTemplates: true,
        canSendNotifications: true,
        canManageCategoryTypes: true,
        canViewCategoryTypes: true,
        canManageUsers: true,
        canViewUsers: true,
      }

    case UserRole.APPROVAL:
      return {
        canCreateTemplates: false,
        canEditTemplates: false,
        canDeleteTemplates: false,
        canApproveTemplates: true,
        canSendNotifications: true,
        canManageCategoryTypes: false,
        canViewCategoryTypes: true,
        canManageUsers: false,
        canViewUsers: true,
      }

    case UserRole.EDITOR:
      return {
        canCreateTemplates: true,
        canEditTemplates: true,
        canDeleteTemplates: true,
        canApproveTemplates: false,
        canSendNotifications: true,
        canManageCategoryTypes: false,
        canViewCategoryTypes: true,
        canManageUsers: false,
        canViewUsers: true,
      }

    case UserRole.VIEW_ONLY:
      return {
        canCreateTemplates: false,
        canEditTemplates: false,
        canDeleteTemplates: false,
        canApproveTemplates: false,
        canSendNotifications: false,
        canManageCategoryTypes: false,
        canViewCategoryTypes: true,
        canManageUsers: false,
        canViewUsers: true,
      }

    default:
      return {
        canCreateTemplates: false,
        canEditTemplates: false,
        canDeleteTemplates: false,
        canApproveTemplates: false,
        canSendNotifications: false,
        canManageCategoryTypes: false,
        canViewCategoryTypes: false,
        canManageUsers: false,
        canViewUsers: false,
      }
  }
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  role: UserRole | undefined,
  permission: keyof PermissionCheck,
): boolean {
  const permissions = getPermissions(role)
  return permissions[permission]
}
