from django.test import TestCase, Client
from django.urls import reverse
from .models import User, Post


class SearchAndFilterTests(TestCase):

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser',
                                             password='testpass')
        self.client.login(username='testuser', password='testpass')

        self.post1 = Post.objects.create(user=self.user,
                                         content="Post about Django")
        self.post1.topics = ['django', 'python']
        self.post1.save()

        self.post2 = Post.objects.create(user=self.user,
                                         content="Post about JavaScript")
        self.post2.topics = ['javascript', 'webdev']
        self.post2.save()

    def test_search_topics_no_matches(self):
        response = self.client.get(reverse('search_topics'),
                                   {'query': 'nonexistent'})
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {'topics': []})

    def test_search_topics_with_matches(self):
        response = self.client.get(reverse('search_topics'),
                                   {'query': 'django'})
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {'topics': ['django']})

    def test_filter_posts_no_matches(self):
        response = self.client.get(reverse('filter_posts'),
                                   {'topic': 'nonexistent'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Sorry, no results for this topic.")

    def test_filter_posts_with_matches(self):
        response = self.client.get(reverse('filter_posts'),
                                   {'topic': 'django'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.post1.content)
        self.assertNotContains(response, self.post2.content)
