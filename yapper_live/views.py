from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render, get_object_or_404
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
import json
from django.core.paginator import Paginator
from django.views.decorators.http import require_POST

from .models import User, Post


def index(request):
    posts = Post.objects.all().order_by('-timestamp')
    paginator = Paginator(posts, 10)  # Show 10 posts per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    return render(request, "yapper_live/index.html", {
        "page_obj": page_obj
    })


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "yapper_live/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "yapper_live/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "yapper_live/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "yapper_live/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "yapper_live/register.html")


@login_required
@csrf_exempt
def new_post(request):
    if request.method == "POST":
        data = json.loads(request.body)
        content = data.get("content", "")
        topics = data.get("topics", "")
        if content == "":
            return JsonResponse({"error": "Post content cannot be empty."},
                                status=400)

        topics_list = [topic.strip().lower() for topic in topics.split('#') if topic.strip()]
        post = Post(user=request.user, content=content, topics=topics_list)
        post.save()
        return JsonResponse({"message": "Post created successfully."},
                            status=201)
    else:
        return JsonResponse({"error": "POST request required."},
                            status=400)


def profile(request, username):
    user = get_object_or_404(User, username=username)
    posts = user.posts.all().order_by('-timestamp')
    paginator = Paginator(posts, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    is_following = request.user.is_authenticated and request.user in user.followers.all()
    if request.method == "POST" and request.user == user:
        user.state = request.POST.get("state", "")
        user.city = request.POST.get("city", "")
        user.save()
        return HttpResponseRedirect(reverse("profile", args=[username]))
    return render(request, "yapper_live/profile.html", {
        "profile_user": user,
        "page_obj": page_obj,
        "is_following": is_following
    })


@login_required
@csrf_exempt
def follow(request, username):
    if request.method == "POST":
        user = get_object_or_404(User, username=username)
        if request.user != user:
            if request.user in user.followers.all():
                user.followers.remove(request.user)
                is_following = False
            else:
                user.followers.add(request.user)
                is_following = True
            return JsonResponse({
                "message": "Follow status changed.",
                "is_following": is_following,
                "followers_count": user.followers.count(),
                "following_count": request.user.following.count()
            }, status=201)
        else:
            return JsonResponse({"error": "You cannot follow yourself."},
                                status=400)
    else:
        return JsonResponse({"error": "POST request required."},
                            status=400)


@login_required
def following(request):
    followed_users = request.user.following.all()
    posts = Post.objects.filter(user__in=followed_users).order_by('-timestamp')
    paginator = Paginator(posts, 10)  # Show 10 posts per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    return render(request, "yapper_live/following.html", {
        "page_obj": page_obj
    })


@login_required
@require_POST
@csrf_exempt
def toggle_like(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    if request.user in post.likes.all():
        post.likes.remove(request.user)
        liked = False
    else:
        post.likes.add(request.user)
        liked = True
    return JsonResponse({
        "liked": liked,
        "likes_count": post.likes.count()
    }, status=200)


@login_required
@csrf_exempt
def edit_post(request, post_id):
    if request.method == "PUT":
        data = json.loads(request.body)
        content = data.get("content", "")
        if content == "":
            return JsonResponse({"error": "Post content cannot be empty."},
                                status=400)

        post = get_object_or_404(Post, id=post_id)
        if post.user != request.user:
            return JsonResponse({"error": "You can only edit your own posts."},
                                status=403)

        post.content = content
        post.edited = True
        post.save()
        return JsonResponse({"message": "Post updated successfully."},
                            status=200)
    else:
        return JsonResponse({"error": "PUT request required."},
                            status=400)


@login_required
@csrf_exempt
def edit_post_from_profile(request, username, post_id):
    if request.method == "PUT":
        data = json.loads(request.body)
        content = data.get("content", "")
        if content == "":
            return JsonResponse({"error": "Post content cannot be empty."},
                                status=400)

        post = get_object_or_404(Post, id=post_id)
        if post.user != request.user:
            return JsonResponse({"error": "You can only edit your own posts."},
                                status=403)

        post.content = content
        post.edited = True
        post.save()
        return JsonResponse({"message": "Post updated successfully."},
                            status=200)
    else:
        return JsonResponse({"error": "PUT request required."},
                            status=400)


def search_topics(request):
    query = request.GET.get('query', '').lower()
    topics = Post.objects.values_list('topics', flat=True)
    unique_topics = set()
    for topic_list in topics:
        unique_topics.update(topic_list)
    filtered_topics = [topic for topic in unique_topics if query in topic]
    return JsonResponse({'topics': filtered_topics})


def filter_posts(request):
    topic = request.GET.get('topic', '').lower()
    posts = Post.objects.filter(topics__icontains=topic).order_by('-timestamp')
    paginator = Paginator(posts, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    if not posts:
        no_results = True
    else:
        no_results = False
    return render(request, "yapper_live/index.html", {
        "page_obj": page_obj,
        "no_results": no_results,
        "searched_topic": topic
    })
