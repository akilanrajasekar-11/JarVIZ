from django.urls import path
from .views import ResourceListView, incident_recommendation, update_assignment_status

urlpatterns = [
    path('resources/', ResourceListView.as_view(), name='resource-list'),
    path('incidents/<int:pk>/recommendation/', incident_recommendation, name='incident-recommendation'),
    path('assignments/<int:pk>/status/', update_assignment_status, name='assignment-status'),
]
