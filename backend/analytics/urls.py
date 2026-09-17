from django.urls import path
from .views import analytics_summary

urlpatterns = [
    path('analytics/summary/', analytics_summary, name='analytics-summary'),
]
