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
from geopy.geocoders import Nominatim
from geopy.distance import geodesic

from .models import User, Post


def get_location_coordinates(location):
    geolocator = Nominatim(user_agent="yapper")
    location = geolocator.geocode(location)
    if location:
        return (location.latitude, location.longitude)
    return None


def calculate_distance(user_location, post_location):
    if user_location and post_location:
        return geodesic(user_location, post_location).miles
    return None


def index(request, page_number=1):
    if request.user.is_authenticated and (not request.user.city
                                          or not request.user.state
                                          or not request.user.max_distance):
        return render(request, "yapper_live/index.html", {
            "error_message": """To see posts from others,
                            add your location and distance preferences"""
        })

    posts = Post.objects.all().order_by('-timestamp')
    paginator = Paginator(posts, 10)
    page_number = request.GET.get('page', page_number)
    page_obj = paginator.get_page(page_number)
    user_location = None
    if request.user.is_authenticated:
        user_location = \
            get_location_coordinates(f"{request.user.city}, \
                                    {request.user.state}")
    for post in page_obj:
        post_location = get_location_coordinates(post.location)
        post.distance = calculate_distance(user_location, post_location)
    return render(request, "yapper_live/index.html", {
        "page_obj": page_obj,
        "posts": page_obj.object_list
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
        try:
            data = json.loads(request.body)
            content = data.get("content", "")
            topics = data.get("topics", "")
            meeting_time = data.get("meeting_time", "")
            location = data.get("location", "")
            image_url = data.get("image_url", "")
            if content == "":
                return JsonResponse({"error":
                                    "Post content cannot be empty."},
                                    status=400)
            if not meeting_time or not location:
                return JsonResponse({"error":
                                    """Please add valid meeting
                                    time and location."""},
                                    status=400)
            if not get_location_coordinates(location):
                return JsonResponse({"error":
                                    """Please add valid meeting
                                    time and location."""},
                                    status=400)
            topics_list = [topic.strip().lower()
                           for topic in topics.split('#')
                           if topic.strip()]
            post = Post(user=request.user, content=content, topics=topics_list,
                        meeting_time=meeting_time, location=location,
                        image_url=image_url)
            post.save()
            return JsonResponse({"message": "Post created successfully."},
                                status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    else:
        return JsonResponse({"error": "POST request required."},
                            status=400)


def profile(request, username):
    user = get_object_or_404(User, username=username)
    posts = user.posts.all().order_by('-timestamp')
    paginator = Paginator(posts, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    is_following = (request.user.is_authenticated
                    and request.user in user.followers.all())
    user_location = None
    if request.user.is_authenticated:
        user_location = \
            get_location_coordinates(f"{request.user.city}, \
                                    {request.user.state}")
    for post in page_obj:
        post_location = get_location_coordinates(post.location)
        post.distance = calculate_distance(user_location, post_location)
    if request.method == "POST" and request.user == user:
        state = request.POST.get("state", "").strip()
        city = request.POST.get("city", "").strip()
        max_distance = request.POST.get("max_distance", "").strip()
        if not (state and city and max_distance):
            return render(request, "yapper_live/profile.html", {
                "profile_user": user,
                "page_obj": page_obj,
                "is_following": is_following,
                "error_message": """You must specify your state,
                    city, and max distance preference before
                    viewing posts from others"""
            })
        user.state = state
        user.city = city
        user.max_distance = max_distance
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
        topics = data.get("topics", "")
        meeting_time = data.get("meeting_time", "")
        location = data.get("location", "")
        # We now handle image_url separately
        new_image_url = data.get("image_url", None)

        if content == "":
            return JsonResponse({"error": "Post content cannot be empty."},
                                status=400)
        if not meeting_time or not location:
            return JsonResponse({"error": """Please add valid meeting
                                    time and location."""},
                                status=400)
        if not get_location_coordinates(location):
            return JsonResponse({"error": """Please add valid meeting
                                    time and location."""},
                                status=400)

        post = get_object_or_404(Post, id=post_id)
        if post.user != request.user:
            return JsonResponse({"error": """You can only edit
                                    your own posts."""},
                                status=403)

        topics_list = [topic.strip().lower() for topic
                       in topics.split('#') if topic.strip()]
        post.content = content
        post.topics = topics_list
        post.meeting_time = meeting_time
        post.location = location

        # Only update image_url if a new, non-empty value is provided
        if new_image_url is not None:
            new_image_url = new_image_url.strip()
            if new_image_url:
                post.image_url = new_image_url
            # If empty, do not overwrite post.image_url

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
        topics = data.get("topics", "")
        meeting_time = data.get("meeting_time", "")
        location = data.get("location", "")
        # Handle image_url here as well
        new_image_url = data.get("image_url", None)

        if content == "":
            return JsonResponse({"error": "Post content cannot be empty."},
                                status=400)
        if not meeting_time or not location:
            return JsonResponse({"error": """Please add valid meeting
                                    time and location."""},
                                status=400)
        if not get_location_coordinates(location):
            return JsonResponse({"error": """Please add valid meeting
                                    time and location."""},
                                status=400)

        post = get_object_or_404(Post, id=post_id)
        if post.user != request.user:
            return JsonResponse({"error": """You can only edit
                                    your own posts."""},
                                status=403)

        topics_list = [topic.strip().lower() for topic
                       in topics.split('#') if topic.strip()]
        post.content = content
        post.topics = topics_list
        post.meeting_time = meeting_time
        post.location = location

        # Only update image_url if a new, non-empty value is provided
        if new_image_url is not None:
            new_image_url = new_image_url.strip()
            if new_image_url:
                post.image_url = new_image_url
            # If empty, do not overwrite post.image_url

        post.edited = True
        post.save()
        return JsonResponse({
            "message": "Post updated successfully.",
            "topics": post.topics
        }, status=200)
    else:
        return JsonResponse({"error": "PUT request required."},
                            status=400)


@login_required
@require_POST
@csrf_exempt
def delete_post(request, post_id):
    post = get_object_or_404(Post, id=post_id)
    if post.user != request.user:
        return JsonResponse({"error": "You can only delete your own posts."},
                            status=403)
    post.delete()
    return JsonResponse({"message": "Post deleted successfully."},
                        status=200)


def search_topics(request):
    query = request.GET.get('query', '').lower()
    all_posts = Post.objects.all()
    unique_topics = set()
    for post in all_posts:
        # post.topics is a list of topics
        unique_topics.update(post.topics)

    filtered_topics = [topic for topic in unique_topics if query in topic]
    return JsonResponse({'topics': filtered_topics})


def filter_posts(request):
    topic = request.GET.get('topic', '').lower()
    posts = Post.objects \
        .filter(topics_str__icontains=topic) \
        .order_by('-timestamp')

    paginator = Paginator(posts, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    no_results = not posts.exists()

    return render(request, "yapper_live/index.html", {
        "page_obj": page_obj,
        "posts": page_obj.object_list,
        "no_results": no_results,
        "searched_topic": topic
    })
