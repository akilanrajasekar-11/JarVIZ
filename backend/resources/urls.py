from django.urls import path
from .views import (
    ResourceListView,
    incident_recommendation,
    update_assignment_status,
    assign_resource_to_incident,
    revoke_assignment,
    complete_assignment,
)

urlpatterns = [
    path('resources/', ResourceListView.as_view(), name='resource-list'),
    path('incidents/<int:pk>/recommendation/', incident_recommendation, name='incident-recommendation'),
    path('incidents/<int:pk>/assign/', assign_resource_to_incident, name='incident-assign-resource'),
    path('assignments/<int:pk>/status/', update_assignment_status, name='assignment-status'),
    path('assignments/<int:pk>/revoke/', revoke_assignment, name='assignment-revoke'),
    path('assignments/<int:pk>/complete/', complete_assignment, name='assignment-complete'),
]


