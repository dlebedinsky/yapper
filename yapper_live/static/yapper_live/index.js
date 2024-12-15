document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');
    
    // Show new post box when "New Post" button is clicked
    const showNewPostButton = document.querySelector('#show-new-post-box');
    const newPostBox = document.querySelector('#new-post-box');
    if (showNewPostButton && newPostBox) {
        showNewPostButton.addEventListener('click', () => {
            newPostBox.style.display = 'block';
            showNewPostButton.style.display = 'none';
        });
    }

    // Handle discard post button click
    const discardPostButton = document.querySelector('#discard-post');
    if (discardPostButton) {
        discardPostButton.addEventListener('click', () => {
            document.querySelector('#new-post-content').value = '';
            document.querySelector('#new-post-topics').value = '';
            newPostBox.style.display = 'none';
            showNewPostButton.style.display = 'block';
        });
    }

    // Use buttons to toggle between views
    const submitPostButton = document.querySelector('#submit-post');
    if (submitPostButton) {
        console.log('Submit post button found');
        submitPostButton.addEventListener('click', () => {
            const content = document.querySelector('#new-post-content').value;
            const topics = document.querySelector('#new-post-topics').value.toLowerCase();
            console.log('Submitting new post:', content, topics);
            fetch('/new_post', {
                method: 'POST',
                body: JSON.stringify({
                    content: content,
                    topics: topics
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(result => {
                console.log(result);
                if (result.message) {
                    alert(result.message);
                    document.querySelector('#new-post-content').value = '';
                    document.querySelector('#new-post-topics').value = '';
                    // Reload posts
                    load_posts();
                } else if (result.error) {
                    alert(result.error);
                }
            });
        });
    } else {
        console.log('Submit post button not found');
    }

    function load_posts() {
        fetch('/')
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            document.querySelector('#posts').innerHTML = doc.querySelector('#posts').innerHTML;
            console.log('Posts loaded');
        });
    }

    // Function to handle like button click
    function handleLikeButtonClick(event) {
        if (!document.querySelector('[name=csrfmiddlewaretoken]')) {
            alert('You must be logged in to like posts.');
            return;
        }

        const button = event.target;
        const postId = button.dataset.postId;
        const likesCountSpan = document.querySelector(`#likes-count-${postId}`);
        let likesCount = parseInt(likesCountSpan.innerText);

        fetch(`/toggle_like/${postId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.liked) {
                button.innerText = 'Unlike';
                likesCount += 1;
            } else {
                button.innerText = 'Like';
                likesCount -= 1;
            }
            likesCountSpan.innerText = likesCount;
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    // Select all like buttons
    document.querySelectorAll('.like-button').forEach(button => {
        button.onclick = handleLikeButtonClick;
    });

    // Function to handle edit button click
    function handleEditButtonClick(event) {
        const button = event.target;
        const postDiv = button.closest('.post');
        const postId = postDiv.dataset.postId;
        const postContentP = postDiv.querySelector('.post-content');
        const originalContent = postContentP.innerText;

        // Create a textarea for editing
        const textarea = document.createElement('textarea');
        textarea.className = 'form-control';
        textarea.value = originalContent;

        // Create a save button
        const saveButton = document.createElement('button');
        saveButton.className = 'btn btn-sm btn-outline-primary mt-2';
        saveButton.innerText = 'Save';
        // Set the data-post-id attribute
        saveButton.dataset.postId = postId;

        // Replace the post content with the textarea and save button
        postContentP.replaceWith(textarea);
        button.replaceWith(saveButton);

        // Handle save button click
        saveButton.onclick = function() {
            const newContent = textarea.value;
            fetch(`/edit_post/${postId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    content: newContent
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(result => {
                if (result.message) {
                    // Replace the textarea with the updated post content
                    const updatedPostContentP = document.createElement('p');
                    updatedPostContentP.className = 'post-content';
                    updatedPostContentP.innerText = newContent;
                    textarea.replaceWith(updatedPostContentP);
                    saveButton.replaceWith(button);
                    // Add edited label
                    const editedLabel = document.createElement('small');
                    editedLabel.className = 'text-muted';
                    editedLabel.innerText = ' (edited)';
                    updatedPostContentP.appendChild(editedLabel);
                } else if (result.error) {
                    alert(result.error);
                }
            });
        };
    }

    // Select all edit buttons
    document.querySelectorAll('.edit-button').forEach(button => {
        button.onclick = handleEditButtonClick;
    });

    // Handle topic search
    const topicSearchInput = document.querySelector('#topic-search');
    const searchButton = document.querySelector('#search-button');
    const suggestionsContainer = document.querySelector('#suggestions');
    if (topicSearchInput && searchButton && suggestionsContainer) {
        topicSearchInput.addEventListener('input', function() {
            const query = topicSearchInput.value.toLowerCase();
            if (query.length > 0) {
                fetch(`/search_topics?query=${query}`)
                .then(response => response.json())
                .then(data => {
                    suggestionsContainer.innerHTML = '';
                    data.topics.forEach(topic => {
                        const suggestionItem = document.createElement('a');
                        suggestionItem.className = 'list-group-item list-group-item-action';
                        suggestionItem.innerText = `#${topic}`;
                        suggestionItem.href = `#`;
                        suggestionItem.addEventListener('click', function(event) {
                            event.preventDefault();
                            topicSearchInput.value = `#${topic}`;
                            suggestionsContainer.style.display = 'none';
                            filterPostsByTopic(topic);
                            searchButton.innerText = 'Clear Search';
                        });
                        suggestionsContainer.appendChild(suggestionItem);
                    });
                    suggestionsContainer.style.display = 'block';
                });
            } else {
                suggestionsContainer.style.display = 'none';
            }
        });

        topicSearchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                const topic = topicSearchInput.value.replace('#', '').toLowerCase();
                filterPostsByTopic(topic);
                suggestionsContainer.style.display = 'none';
                searchButton.innerText = 'Clear Search';
            }
        });

        searchButton.addEventListener('click', function() {
            if (searchButton.innerText === 'Clear Search') {
                topicSearchInput.value = '';
                load_posts();
                searchButton.innerText = 'Search';
            } else {
                const topic = topicSearchInput.value.replace('#', '').toLowerCase();
                filterPostsByTopic(topic);
                suggestionsContainer.style.display = 'none';
                searchButton.innerText = 'Clear Search';
            }
        });

        document.addEventListener('click', function(event) {
            if (!suggestionsContainer.contains(event.target) && event.target !== topicSearchInput) {
                suggestionsContainer.style.display = 'none';
            }
        });
    }

    function filterPostsByTopic(topic) {
        fetch(`/filter_posts?topic=${topic}`)
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const postsContainer = document.querySelector('#posts');
            postsContainer.innerHTML = doc.querySelector('#posts').innerHTML;
            if (postsContainer.innerHTML.trim() === '') {
                postsContainer.innerHTML = '<p>No posts found for this topic.</p>';
            }
            console.log('Posts filtered by topic:', topic);
        });
    }
});