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
            document.querySelector('#new-post-meeting-date').value = '';
            document.querySelector('#new-post-meeting-time').value = '';
            document.querySelector('#new-post-location').value = '';
            document.querySelector('#new-post-image-url').value = '';
            newPostBox.style.display = 'none';
            showNewPostButton.style.display = 'block';
        });
    }

    // Use buttons to toggle between views
    const submitPostButton = document.querySelector('#submit-post');
    const postError = document.querySelector('#post-error');
    if (submitPostButton) {
        submitPostButton.addEventListener('click', () => {
            const content = document.querySelector('#new-post-content').value;
            const topics = document.querySelector('#new-post-topics').value.toLowerCase();
            const meetingDate = document.querySelector('#new-post-meeting-date').value;
            const meetingTime = document.querySelector('#new-post-meeting-time').value;
            const meetingDateTime = `${meetingDate} ${meetingTime}`;
            const location = document.querySelector('#new-post-location').value;
            const imageUrl = document.querySelector('#new-post-image-url').value;

            fetch('/new_post', {
                method: 'POST',
                body: JSON.stringify({
                    content: content,
                    topics: topics,
                    meeting_time: meetingDateTime,
                    location: location,
                    image_url: imageUrl
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(result => {
                if (result.message) {
                    alert(result.message);
                    document.querySelector('#new-post-content').value = '';
                    document.querySelector('#new-post-topics').value = '';
                    document.querySelector('#new-post-meeting-date').value = '';
                    document.querySelector('#new-post-meeting-time').value = '';
                    document.querySelector('#new-post-location').value = '';
                    document.querySelector('#new-post-image-url').value = '';
                    postError.style.display = 'none';
                    // Reload posts
                    load_posts();
                } else if (result.error) {
                    postError.innerText = result.error;
                    postError.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                postError.innerText = 'An error occurred while creating the post.';
                postError.style.display = 'block';
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
        const postTopicsP = postDiv.querySelector('.post-topics');
        const originalTopics = Array.from(postTopicsP.querySelectorAll('.badge')).map(badge => badge.innerText.replace('#', '')).join(' ');
        const meetingTimeP = postDiv.querySelector('.post-meeting-time');
        const originalMeetingTime = meetingTimeP ? meetingTimeP.innerText.replace('Meeting Time: ', '') : '';
        const locationP = postDiv.querySelector('.post-location');
        const originalLocation = locationP ? locationP.innerText.replace('Location: ', '') : '';
        const originalImageUrl = postDiv.querySelector('img') ? postDiv.querySelector('img').src : '';
        const likeButton = postDiv.querySelector('.like-button');
        const deleteButton = postDiv.querySelector('.delete-button');

        // Hide the like button while editing
        if (likeButton) {
            likeButton.style.display = 'none';
        }

        // Create a textarea for editing content
        const textarea = document.createElement('textarea');
        textarea.className = 'form-control';
        textarea.value = originalContent;

        // Create an input for editing topics
        const topicsInput = document.createElement('input');
        topicsInput.className = 'form-control mt-2';
        topicsInput.value = originalTopics;

        // Create inputs for editing meeting date and time
        const [originalMeetingDate, originalMeetingTimeOnly] = originalMeetingTime.split(' ');
        const meetingDateInput = document.createElement('input');
        meetingDateInput.type = 'date';
        meetingDateInput.className = 'form-control mt-2';
        meetingDateInput.value = originalMeetingDate;

        const meetingTimeInput = document.createElement('input');
        meetingTimeInput.type = 'time';
        meetingTimeInput.className = 'form-control mt-2';
        meetingTimeInput.value = originalMeetingTimeOnly;

        // Create an input for editing location
        const locationInput = document.createElement('input');
        locationInput.className = 'form-control mt-2';
        locationInput.value = originalLocation;

        // Create an input for editing image URL
        const imageUrlInput = document.createElement('input');
        imageUrlInput.className = 'form-control mt-2';
        imageUrlInput.value = originalImageUrl;

        // Create a save button
        const saveButton = document.createElement('button');
        saveButton.className = 'btn btn-sm btn-outline-primary mt-2';
        saveButton.innerText = 'Save';
        saveButton.dataset.postId = postId;

        // Create a cancel button
        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn btn-sm btn-outline-secondary mt-2 ml-2';
        cancelButton.innerText = 'Cancel';

        // Replace the post content with the textarea and save button
        postContentP.replaceWith(textarea);
        postDiv.insertBefore(topicsInput, button);
        postDiv.insertBefore(meetingDateInput, button);
        postDiv.insertBefore(meetingTimeInput, button);
        postDiv.insertBefore(locationInput, button);
        postDiv.insertBefore(imageUrlInput, button);
        button.replaceWith(saveButton);
        saveButton.insertAdjacentElement('afterend', cancelButton);

        // Align save and cancel buttons with delete button
        saveButton.style.marginTop = deleteButton.style.marginTop;
        cancelButton.style.marginTop = deleteButton.style.marginTop;

        // Handle save button click
        saveButton.onclick = function() {
            const newContent = textarea.value;
            const newTopics = topicsInput.value;
            const newMeetingDate = meetingDateInput.value;
            const newMeetingTime = meetingTimeInput.value;
            const newMeetingDateTime = `${newMeetingDate} ${newMeetingTime}`;
            const newLocation = locationInput.value;
            const newImageUrl = imageUrlInput.value;
            fetch(`/edit_post/${postId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    content: newContent,
                    topics: newTopics,
                    meeting_time: newMeetingDateTime,
                    location: newLocation,
                    image_url: newImageUrl
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
                    cancelButton.remove();
                    // Update topics
                    const updatedTopicsP = document.createElement('p');
                    updatedTopicsP.className = 'post-topics';
                    newTopics.split(' ').forEach(topic => {
                        const badge = document.createElement('span');
                        badge.className = 'badge badge-primary';
                        badge.innerText = `#${topic}`;
                        updatedTopicsP.appendChild(badge);
                    });
                    topicsInput.replaceWith(updatedTopicsP);
                    // Update meeting time and location
                    const updatedMeetingTimeP = document.createElement('p');
                    updatedMeetingTimeP.className = 'post-meeting-time';
                    updatedMeetingTimeP.innerText = `Meeting Time: ${newMeetingDateTime}`;
                    meetingDateInput.replaceWith(updatedMeetingTimeP);
                    meetingTimeInput.remove();
                    const updatedLocationP = document.createElement('p');
                    updatedLocationP.className = 'post-location';
                    updatedLocationP.innerText = `Location: ${newLocation}`;
                    locationInput.replaceWith(updatedLocationP);
                    // Update image URL
                    if (newImageUrl) {
                        const updatedImageUrlImg = document.createElement('img');
                        updatedImageUrlImg.src = newImageUrl;
                        updatedImageUrlImg.alt = 'Post Image';
                        updatedImageUrlImg.style.maxWidth = '400px';
                        updatedImageUrlImg.style.maxHeight = '300px';
                        updatedImageUrlImg.style.marginRight = '10px';
                        if (postDiv.querySelector('img')) {
                            postDiv.querySelector('img').replaceWith(updatedImageUrlImg);
                        } else {
                            postDiv.appendChild(updatedImageUrlImg);
                        }
                    }
                    imageUrlInput.remove();
                    // Add edited label
                    const editedLabel = document.createElement('small');
                    editedLabel.className = 'text-muted';
                    editedLabel.innerText = ' (edited)';
                    updatedPostContentP.appendChild(editedLabel);
                    // Show the like button again
                    if (likeButton) {
                        likeButton.style.display = 'inline-block';
                    }
                } else if (result.error) {
                    alert(result.error);
                }
            });
        };

        // Handle cancel button click
        cancelButton.onclick = function() {
            textarea.replaceWith(postContentP);
            topicsInput.replaceWith(postTopicsP);
            meetingDateInput.remove();
            meetingTimeInput.remove();
            locationInput.replaceWith(locationP);
            imageUrlInput.remove();
            saveButton.replaceWith(button);
            cancelButton.remove();
            // Show the like button again
            if (likeButton) {
                likeButton.style.display = 'inline-block';
            }
        };
    }

    // Select all edit buttons
    document.querySelectorAll('.edit-button').forEach(button => {
        button.onclick = handleEditButtonClick;
    });

    // Function to handle delete button click
    function handleDeleteButtonClick(event) {
        const button = event.target;
        const postDiv = button.closest('.post');
        const postId = postDiv.dataset.postId;

        if (confirm("Are you sure you want to delete your post?")) {
            fetch(`/delete_post/${postId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(result => {
                if (result.message) {
                    postDiv.remove();
                    alert(result.message);
                } else if (result.error) {
                    alert(result.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        }
    }

    // Select all delete buttons
    document.querySelectorAll('.delete-button').forEach(button => {
        button.onclick = handleDeleteButtonClick;
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
    
            // Reattach event listeners for like, edit, delete buttons
            // Otherwise, I can't click them when I search for a topic
            postsContainer.querySelectorAll('.like-button').forEach(button => {
                button.onclick = handleLikeButtonClick;
            });
    
            postsContainer.querySelectorAll('.edit-button').forEach(button => {
                button.onclick = handleEditButtonClick;
            });
    
            postsContainer.querySelectorAll('.delete-button').forEach(button => {
                button.onclick = handleDeleteButtonClick;
            });
        });
    }
});