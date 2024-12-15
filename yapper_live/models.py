from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    followers = models.ManyToManyField('self',
                                       symmetrical=False,
                                       related_name='following',
                                       blank=True)
    state = models.CharField(max_length=2, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    max_distance = models.FloatField(blank=True, null=True)  # New field for max distance


class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, related_name="liked_posts", blank=True)
    edited = models.BooleanField(default=False)
    topics_str = models.TextField(blank=True, default='')
    meeting_time = models.CharField(max_length=20, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}: {self.content}"

    @property
    def topics(self):
        # Parse the string to return a list of topics
        # Assuming topics are separated by '#' just like the original code logic
        return [t.strip() for t in self.topics_str.split('#') if t.strip()]

    @topics.setter
    def topics(self, topics_list):
        # Clean and store them back as a single string
        cleaned_topics = [t.strip().lower() for t in topics_list if t.strip()]
        if cleaned_topics:
            # Join them with '#' for consistency
            self.topics_str = '#' + '#'.join(cleaned_topics)
        else:
            self.topics_str = ''