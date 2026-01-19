from rest_framework import permissions
from .models import UserProfile

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to Admin users.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.userprofile.role == 'ADMIN'
        except UserProfile.DoesNotExist:
            return False


class IsSupervisorOrAdmin(permissions.BasePermission):
    """
    Allows access to Supervisors or Admins.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.userprofile.role in ['SUPERVISOR', 'ADMIN']
        except UserProfile.DoesNotExist:
            return False


class IsFieldCollector(permissions.BasePermission):
    """
    Allows access only to Field Collectors.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.userprofile.role == 'FIELD_COLLECTOR'
        except UserProfile.DoesNotExist:
            return False


class IsOwnerOrSupervisorOrAdmin(permissions.BasePermission):
    """
    Object-level permission to allow:
    - Field Collectors to edit their own observations
    - Supervisors and Admins to edit any
    """

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Superusers and staff always have access
        if request.user.is_superuser or request.user.is_staff:
            return True

        try:
            role = request.user.userprofile.role
            if role in ['SUPERVISOR', 'ADMIN']:
                return True
            elif role == 'FIELD_COLLECTOR':
                # Only allow if the user is the data_collector of this object
                return hasattr(obj, 'data_collector') and obj.data_collector == request.user
        except UserProfile.DoesNotExist:
            # Fallback: if no profile but is owner, allow access
            return hasattr(obj, 'data_collector') and obj.data_collector == request.user

        return False
