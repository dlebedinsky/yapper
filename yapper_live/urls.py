from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("new_post", views.new_post, name="new_post"),
    path("profile/<str:username>", views.profile, name="profile"),
    path("profile/<str:username>/edit_post/<int:post_id>",
         views.edit_post_from_profile,
         name="edit_post_from_profile"),
    path("follow/<str:username>", views.follow, name="follow"),
    path("following", views.following, name="following"),
    path("toggle_like/<int:post_id>", views.toggle_like, name="toggle_like"),
    path("edit_post/<int:post_id>", views.edit_post, name="edit_post"),
    path("search_topics", views.search_topics, name="search_topics"),
    path("filter_posts", views.filter_posts, name="filter_posts"),
    path("delete_post/<int:post_id>", views.delete_post, name="delete_post"),
]
