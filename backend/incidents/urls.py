from django.urls import path
from .views import (
    ReportCreateView,
    IncidentListView,
    IncidentDetailView,
    incident_timeline,
    incident_approve,
    MyReportsView,
)

urlpatterns = [
    path('reports/', ReportCreateView.as_view(), name='report-create'),
    path('reports/mine/', MyReportsView.as_view(), name='my-reports'),
    path('incidents/', IncidentListView.as_view(), name='incident-list'),
    path('incidents/<int:pk>/', IncidentDetailView.as_view(), name='incident-detail'),
    path('incidents/<int:pk>/timeline/', incident_timeline, name='incident-timeline'),
    path('incidents/<int:pk>/approve/', incident_approve, name='incident-approve'),
]
