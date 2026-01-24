from rest_framework import permissions
from .models import UserProfile

class IsAdministrator(permissions.BasePermission):
    """
    Allows access only to Administrator users.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.userprofile.role == 'ADMIN'
        except UserProfile.DoesNotExist:
            return False


class IsViewerOrAdministrator(permissions.BasePermission):
    """
    Allows access to Viewer or Administrator roles.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.userprofile.role in ['VIEWER', 'ADMIN']
        except UserProfile.DoesNotExist:
            return False


class IsFieldManager(permissions.BasePermission):
    """
    Allows access only to Field Managers.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.userprofile.role == 'FIELD_MANAGER'
        except UserProfile.DoesNotExist:
            return False


class IsOwnerOrViewerOrAdministrator(permissions.BasePermission):
    """
    Object-level permission to allow:
    - Field Managers to edit their own observations
    - Viewers and Administrators to edit any
    """

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers and staff always have access
        if request.user.is_superuser or request.user.is_staff:
            return True

        try:
            role = request.user.userprofile.role
            if role in ['VIEWER', 'ADMIN']:
                return True
            elif role == 'FIELD_MANAGER':
                # Only allow if the user is the data_collector of this object
                return hasattr(obj, 'data_collector') and obj.data_collector == request.user
        except UserProfile.DoesNotExist:
            # Fallback: if no profile but is owner, allow access
            return hasattr(obj, 'data_collector') and obj.data_collector == request.user

        return False
