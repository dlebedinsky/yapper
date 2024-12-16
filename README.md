# yapper
Yapper is a social network for facilitating in-person conversations. The goal is for users to find someone who lives not too far away from them, who is open to talking about their shared interests or participation in a shared activity, and wants to spontaneously hang out.

## Video
Pinned to the top of my YouTube channel. Feel free to subscribe!
https://www.youtube.com/@daniellebedinsky2705

## Directory structure
The yapper app is contained in the `yapper_live` sub-directory within the main `yapper` directory. All HTML files are in `templates/yapper_live`, all javascript files are in `static/yapper_live`, and all python files are in the main `yapper_live`. Below, I have detailed all files that I have modified.

## settings.py and requirements.txt
The settings file contains `django_extensions` which I found useful at various times when testing. Occasionally, I might enter data that might cause the app to break, so I would run `python3 manage.py reset_db`, which is not included in django by default. Also, I modified the environemnt variable `DEFAULT_AUTO_FIELD`, which was causing an annoying but otherwise harmless warning message.

Requirements.txt includes `django_extensions` as well as the Python library `geopy`, which is used to find distances between two cities or addresses, essential to the distance-filtering functionality of Yapper. This library is free, unlike the paid Google Maps API that I discussed using in my proposal, but as the common expression goes, "you get what you pay for." Geopy has a tendency to crash when I enter small towns or excessively large distances while testing, so if there were to be a future improvement to Yapper, I would prioritize replacing geopy with google maps.

## Python files

### urls.py
Defines the crucial links in the Yapper website, notably `/following` which allows users to see posts from their friends first, login and registration, `profile/<str:username>` which allows a user to edit their location settings and access every post they have made in the past for easy editing or deletion, the index, which contains all posts and the search by topic functionality. It also has links which most users wouldn't visit directly but offer important functionality, like `edit_post`.

### models.py
Each user of Yapper is required to enter their state and city name when they register, as well as their maximum preferred distance. This allows me to show them posts that are not too far from where they live. 
The other model is the Post itself. This contains the meeting point, time of meeting, a list of topics, description of the event, and an optional photo (in the form of a link). The point of Yapper is to connect with others in person, and we want users to be able to meet people who live not too far from them and share common interests. The data in each post allows them to find people and events of interest to them.

### views.py
I will briefly describe the intended purpose of each python function in this file. Overall, this is the file that enables all geolocation functionality, interactions between users, user content generation, and content search on the backend. 

- `get_location_coordinates(location)`: Retrieves the latitude and longitude of a given location using geopy
- `calculate_distance(user_location, post_location)`: Calculates the distance in miles between two locations.
- `index(request, page_number=1)`: Displays the main page with a list of posts, filtered by the user's location and distance preferences.
- `login_view(request)`: Handles user login. (borrowed from Network project)
- `logout_view(request)`: Logs out the user. (borrowed from Network project)
- `register(request)`: Handles user registration. (borrowed from Network project)
- `new_post(request)`: Allows authenticated users to create a new post.
- `profile(request, username)`: Displays the profile page of a user, including their posts and the ability to update location preferences.
- `follow(request, username)`: Allows authenticated users to follow or unfollow another user.
- `following(request)`: Displays posts from users that the authenticated user is following.
- `toggle_like(request, post_id)`: Allows authenticated users to like or unlike a post.
- `edit_post(request, post_id)`: Allows authenticated users to edit their own posts.
- `edit_post_from_profile(request, username, post_id)`: Allows authenticated users to edit their own posts from their profile page. I did not create this function deliberately, I was hoping there could be one url for editing posts from anywhere, but unfortunately this was the only method I could think of for overcoming a bug where the app wouldn't let me edit anything from profiles.
- `delete_post(request, post_id)`: Allows authenticated users to delete their own posts.
- `search_topics(request)`: Searches for topics in posts based on a query.
- `filter_posts(request)`: Filters posts based on a specific topic.

### tests.py
I found it particularly difficult to get the filtering by topic functionality to work correctly. I was positive that the view functions were causing the problem, so I created several unit tests to ensure they were working as intended (ie, returning no matches when there would be none, returning correct matches when there is a match). They were instrumental in helping me catch the bugs in filtering.

## CSS
I am predominantly using Bootstrap in this project, for its great variety of convenient classes. I did have to write some custom CSS of my own, for aesthetic reasons. Strangely enough, I could not get styles.css to work while using bootstrap, so I put all of my CSS in the style tag of layout.html.

## HTML files
Note: All pages except for login and register include pagination, so that users can access older posts without crashing the app.

### layout.html
This file serves as the base template for all other HTML pages. It includes the necessary Bootstrap CSS and JavaScript dependencies, and the custom CSS that I discussed earlier. I used my CSS to give yapper an aqua theme, and fix various issues that came up with alignment and scaling. The navigation bar at the top provides links to the main sections of the site: the user's profile, all posts, following posts, login, and registration. The body of the page is populated with content from other HTML templates as the app runs.

### login.html and register.html
Yapper started out as an extension of the social network project, and these files are virtually unchanged from there.

### index.html
The index is the main page of yapper. It shows a list of posts filtered by the user's location and distance preferences. It includes a search bar for filtering posts by topic, and a form for authenticated users to create new posts including text, arbitrarily many topics, a meeting time, a location, and a link to an image. Each post displays this info and distance (if geopy is successful in computing it). Users have the option to like each other's posts (so the poster can estimate how many people will meet them), and posters can edit or delete their own posts, from here or from their profiles.

### following.html
This is quite similar to my implementation of following for the social network project, the main difference is the content being displayed.

### profile.html
This is the user profile, which includes a form to update their state, city, and maximum preferred distance, that only the authenticated user can view, and they are required to complete it before viewing posts from others, in order for the distance filtering to work. The profile displays the username, follower and following counts, and a form to follow or unfollow the user if the viewer is authenticated and not the profile owner. Below this, it lists all posts made by the user, with options to like, edit, or delete each post, based on authentication.

## JavaScript files

### index.js
This file contains the JavaScript code for handling various interactive features on the main page, without the user having to refresh it.

- `load_posts()`: Fetches and loads the posts from the server.
- `handleLikeButtonClick(event)`: Handles the like button click event, toggling the like status of a post. (borrowed from Network project)
- `handleEditButtonClick(event)`: Handles the edit button click event, allowing users to edit their posts. This was the most involved function, I had to revise it many times to allow users to change images, topics, location, and text within their post, save changes to their post, or cancel and discard their edits.
- `handleDeleteButtonClick(event)`: Handles the delete button click event, allowing users to delete their own posts.
- `filterPostsByTopic(topic)`: Filters posts based on a specific topic.
- There are also event listeners for showing the new post box, discarding a post, submitting a post, and searching for topics.

### profile.js
Largely analogous to index.js, except it only shows posts from a specific user's profile. I had to do some awkward copying and modifying of the `handleEditButtonClick(event)` to avoid bugs.

## Cloning from github
Django apps must have at least one migration to run, so `cd` into the main directory and run `python3 manage.py makemigrations` and `python3 manage.py migrate` before running `python3 manage.py runserver` to start yapper.
