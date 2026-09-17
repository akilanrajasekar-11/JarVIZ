from django.urls import path
from .views import (
    ReportCreateView,
    IncidentListView,
    IncidentDetailView,
    incident_timeline,
    incident_approve,
    incident_close,
    MyReportsView,
    AllReportsView,
    security_approve_report,
    update_report_status,
    incident_separation_tasks,
    separation_tasks_list,
    separation_task_update_status,
)

urlpatterns = [
    path('reports/', ReportCreateView.as_view(), name='report-create'),
    path('reports/mine/', MyReportsView.as_view(), name='my-reports'),
    path('reports/all/', AllReportsView.as_view(), name='reports-all'),
    path('reports/<int:pk>/status/', update_report_status, name='report-update-status'),
    path('reports/<int:pk>/security-approve/', security_approve_report, name='report-security-approve'),
    path('incidents/', IncidentListView.as_view(), name='incident-list'),
    path('incidents/<int:pk>/', IncidentDetailView.as_view(), name='incident-detail'),
    path('incidents/<int:pk>/timeline/', incident_timeline, name='incident-timeline'),
    path('incidents/<int:pk>/approve/', incident_approve, name='incident-approve'),
    path('incidents/<int:pk>/close/', incident_close, name='incident-close'),
    path('incidents/<int:pk>/separation-tasks/', incident_separation_tasks, name='incident-separation-tasks'),
    path('separation-tasks/', separation_tasks_list, name='separation-tasks-list'),
    path('separation-tasks/<int:pk>/status/', separation_task_update_status, name='separation-task-status'),
]

