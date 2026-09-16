"""
Permissions for JarVIZ incident views.
"""
from rest_framework.permissions import BasePermission
from users.models import UserRole


class IsOperator(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserRole.OPERATOR


class IsReporterOrOperator(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.is_reporter or request.user.is_operator


class IsOperatorOrTeam(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.is_operator or request.user.is_response_team
