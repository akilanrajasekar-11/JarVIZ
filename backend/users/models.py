"""
Users app — CustomUser model with role-based access for JarVIZ
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    STUDENT = 'STUDENT', 'Student'
    FACULTY = 'FACULTY', 'Faculty'
    SECURITY = 'SECURITY', 'Security Staff'
    OPERATOR = 'OPERATOR', 'Emergency Operator'
    TEAM_MEDICAL = 'TEAM_MEDICAL', 'Medical Team'
    TEAM_FIRE = 'TEAM_FIRE', 'Fire Team'
    TEAM_HAZMAT = 'TEAM_HAZMAT', 'Hazmat / EHS Team'
    TEAM_SECURITY = 'TEAM_SECURITY', 'Security Response Team'
    TEAM_FACILITIES = 'TEAM_FACILITIES', 'Facilities Team'


# Roles that can submit incident reports
REPORTER_ROLES = {
    UserRole.STUDENT,
    UserRole.FACULTY,
    UserRole.SECURITY,
}

# Roles that are response teams
TEAM_ROLES = {
    UserRole.TEAM_MEDICAL,
    UserRole.TEAM_FIRE,
    UserRole.TEAM_HAZMAT,
    UserRole.TEAM_SECURITY,
    UserRole.TEAM_FACILITIES,
}


class CustomUser(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.STUDENT,
    )
    phone = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    @property
    def is_reporter(self):
        return self.role in REPORTER_ROLES

    @property
    def is_operator(self):
        return self.role == UserRole.OPERATOR

    @property
    def is_response_team(self):
        return self.role in TEAM_ROLES

    def __str__(self):
        return f'{self.username} ({self.get_role_display()})'
