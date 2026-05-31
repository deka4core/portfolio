from django.urls import path
from . import views

urlpatterns = [
    # pages
    path("", views.index, name="index"),
    path("admin-panel/", views.admin_panel, name="admin_panel"),

    # projects API
    path("api/projects/", views.projects_list, name="projects_list"),
    path("api/projects/<slug:slug>/", views.project_detail, name="project_detail"),

    # certificates API
    path("api/certs/", views.certs_list, name="certs_list"),
    path("api/certs/<int:pk>/", views.cert_detail, name="cert_detail"),

    # portfolio data for frontend
    path("api/portfolio-data/", views.portfolio_data, name="portfolio_data"),

    # github widget
    path("api/github/", views.github_activity, name="github_activity"),
]
