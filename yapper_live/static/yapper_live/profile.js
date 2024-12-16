// This is heavily based on index.js, with some adaptations.
document.addEventListener('DOMContentLoaded', function() {
    const followButton = document.querySelector('#follow-button');
    if (followButton) {
        followButton.addEventListener('click', (event) => {
            event.preventDefault();
            const username = document.querySelector('h2').innerText;
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
            fetch(`/follow/${username}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                }
            })
            .then(response => response.json())
            .then(result => {
                if (result.message) {
                    followButton.innerText = result.is_following ? 'Unfollow' : 'Follow';
                    document.querySelector('#followers-count').innerText = `Followers: ${result.followers_count}`;
                    // Remove the following count update
                } else if (result.error) {
                    alert(result.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    }

    const cityInput = document.querySelector('#city');
    if (cityInput) {
        cityInput.addEventListener('focus', function() {
            if (cityInput.value === 'None') {
                cityInput.value = '';
            }
        });
        cityInput.addEventListener('blur', function() {
            if (cityInput.value === '') {
                cityInput.value = 'None';
            }
        });
    }

    function handleLikeButtonClick(event) {
        if (!document.querySelector('[name=csrfmiddlewaretoken]')) {
            alert('You must be logged in to like posts.');
            return;
        }

        const button = event.target;
        const postId = button.dataset.postId;
        const likesCountSpan = document.querySelector(`#likes-count-${postId}`);
        if (!likesCountSpan) {
            console.error(`Likes count span not found for post ID ${postId}`);
            return;
        }
        let likesCount = parseInt(likesCountSpan.innerText);

        fetch(`/toggle_like/${postId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => {
            console.log(response);
            return response.json();
        })
        .then(result => {
            console.log(result);
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

    function handleEditButtonClick(event) {
        const button = event.target;
        const postDiv = button.closest('.post');
        const postId = postDiv.dataset.postId;

        // Get the username and content from the page. 
        const username = document.querySelector('#profile-username').innerText.trim();
        const contentContainer = postDiv.querySelector('.d-flex > div') || postDiv;
        const postContentP = contentContainer.querySelector('.post-content');
        const originalContent = postContentP.innerText;

        const postTopicsP = contentContainer.querySelector('.post-topics');
        const originalTopics = Array.from(postTopicsP.querySelectorAll('.badge'))
            .map(badge => badge.innerText.replace('#', '')).join(' ');

        const meetingTimeP = contentContainer.querySelector('.post-meeting-time');
        const originalMeetingTime = meetingTimeP ? meetingTimeP.innerText.replace('Meeting Time: ', '') : '';

        const locationP = contentContainer.querySelector('.post-location');
        const originalLocation = locationP ? locationP.innerText.replace('Location: ', '') : '';

        const originalImage = contentContainer.querySelector('img');
        const originalImageUrl = originalImage ? originalImage.src : '';

        const likeButton = postDiv.querySelector('.like-button');
        const deleteButton = postDiv.querySelector('.delete-button');

        // Hide the like button while editing
        if (likeButton) {
            likeButton.style.display = 'none';
        }

        // Create edit fields
        const textarea = document.createElement('textarea');
        textarea.className = 'form-control';
        textarea.value = originalContent;

        const topicsInput = document.createElement('input');
        topicsInput.className = 'form-control mt-2';
        topicsInput.value = originalTopics;

        const [originalMeetingDate, originalMeetingTimeOnly] = originalMeetingTime.split(' ');
        const meetingDateInput = document.createElement('input');
        meetingDateInput.type = 'date';
        meetingDateInput.className = 'form-control mt-2';
        meetingDateInput.value = originalMeetingDate;

        const meetingTimeInput = document.createElement('input');
        meetingTimeInput.type = 'time';
        meetingTimeInput.className = 'form-control mt-2';
        meetingTimeInput.value = originalMeetingTimeOnly;

        const locationInput = document.createElement('input');
        locationInput.className = 'form-control mt-2';
        locationInput.value = originalLocation;

        const imageUrlInput = document.createElement('input');
        imageUrlInput.className = 'form-control mt-2';
        imageUrlInput.value = originalImageUrl;
        imageUrlInput.placeholder = "To change image, paste link here";

        const saveButton = document.createElement('button');
        saveButton.className = 'btn btn-sm btn-outline-primary mt-2';
        saveButton.innerText = 'Save';
        saveButton.dataset.postId = postId;

        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn btn-sm btn-outline-secondary mt-2 ml-2';
        cancelButton.innerText = 'Cancel';

        // Replace original elements with edit fields
        postContentP.replaceWith(textarea);
        postTopicsP.replaceWith(topicsInput);

        if (meetingTimeP) {
            meetingTimeP.replaceWith(meetingDateInput);
            contentContainer.insertBefore(meetingTimeInput, locationP || originalImage || null);
        }

        if (locationP) {
            locationP.replaceWith(locationInput);
        }

        if (originalImage) {
            originalImage.replaceWith(imageUrlInput);
        } else {
            contentContainer.appendChild(imageUrlInput);
        }

        button.replaceWith(saveButton);
        saveButton.insertAdjacentElement('afterend', cancelButton);

        if (deleteButton && deleteButton.style.marginTop) {
            saveButton.style.marginTop = deleteButton.style.marginTop;
            cancelButton.style.marginTop = deleteButton.style.marginTop;
        } 

        saveButton.onclick = function() {
            const newContent = textarea.value;
            const newTopics = topicsInput.value;
            const newMeetingDate = meetingDateInput.value;
            const newMeetingTime = meetingTimeInput.value;
            const newMeetingDateTime = `${newMeetingDate} ${newMeetingTime}`;
            const newLocation = locationInput.value;
            const newImageUrl = imageUrlInput.value.trim();

            const bodyData = {
                content: newContent,
                topics: newTopics,
                meeting_time: newMeetingDateTime,
                location: newLocation
            };
            
            if (newImageUrl) {
                bodyData.image_url = newImageUrl;
            } else {
                // If there was no original image or no new image provided,
                // omit image_url so the backend doesn't overwrite it.
            }

            fetch(`/edit_post_from_profile/${username}/${postId}`, {
                method: 'PUT',
                body: JSON.stringify(bodyData),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(result => {
                if (result.message) {
                    // Replace textarea with updated content
                    const updatedPostContentP = document.createElement('p');
                    updatedPostContentP.className = 'post-content';
                    updatedPostContentP.innerText = newContent;
                    textarea.replaceWith(updatedPostContentP);
                    saveButton.replaceWith(button);
                    cancelButton.remove();

                    const updatedTopicsP = document.createElement('p');
                    updatedTopicsP.className = 'post-topics';
                    newTopics.split(' ').forEach(topic => {
                        const badge = document.createElement('span');
                        badge.className = 'badge badge-primary';
                        badge.innerText = `#${topic}`;
                        updatedTopicsP.appendChild(badge);
                    });
                    topicsInput.replaceWith(updatedTopicsP);

                    const updatedMeetingTimeP = document.createElement('p');
                    updatedMeetingTimeP.className = 'post-meeting-time';
                    updatedMeetingTimeP.innerText = `Meeting Time: ${newMeetingDateTime}`;
                    meetingDateInput.replaceWith(updatedMeetingTimeP);
                    meetingTimeInput.remove();

                    const updatedLocationP = document.createElement('p');
                    updatedLocationP.className = 'post-location';
                    updatedLocationP.innerText = `Location: ${newLocation}`;
                    locationInput.replaceWith(updatedLocationP);

                    if (newImageUrl) {
                        const updatedImageUrlImg = document.createElement('img');
                        updatedImageUrlImg.src = newImageUrl;
                        updatedImageUrlImg.alt = 'Post Image';
                        updatedImageUrlImg.style.maxWidth = '400px';
                        updatedImageUrlImg.style.maxHeight = '300px';
                        updatedImageUrlImg.style.marginRight = '10px';

                        if (contentContainer.querySelector('img')) {
                            contentContainer.querySelector('img').replaceWith(updatedImageUrlImg);
                        } else {
                            contentContainer.appendChild(updatedImageUrlImg);
                        }
                        imageUrlInput.remove();
                    } else {
                        if (originalImageUrl) {
                            const restoredImg = document.createElement('img');
                            restoredImg.src = originalImageUrl;
                            restoredImg.alt = 'Post Image';
                            restoredImg.style.maxWidth = '400px';
                            restoredImg.style.maxHeight = '300px';
                            restoredImg.style.marginRight = '10px';
                        
                            imageUrlInput.replaceWith(restoredImg);
                        } else {
                            imageUrlInput.remove();
                        }
                    }

                    const editedLabel = document.createElement('small');
                    editedLabel.className = 'text-muted';
                    editedLabel.innerText = ' (edited)';
                    updatedPostContentP.appendChild(editedLabel);

                    if (likeButton) {
                        likeButton.style.display = 'inline-block';
                    }
                } else if (result.error) {
                    alert(result.error);
                }
            });
        };

        cancelButton.onclick = function() {
            // Restore original content
            textarea.replaceWith(postContentP);
            topicsInput.replaceWith(postTopicsP);

            const originalMeetingTimeP = document.createElement('p');
            originalMeetingTimeP.className = 'post-meeting-time';
            originalMeetingTimeP.innerText = `Meeting Time: ${originalMeetingTime}`;
            meetingDateInput.replaceWith(originalMeetingTimeP);
            meetingTimeInput.remove();

            const originalLocationP = document.createElement('p');
            originalLocationP.className = 'post-location';
            originalLocationP.innerText = `Location: ${originalLocation}`;
            locationInput.replaceWith(originalLocationP);

            imageUrlInput.remove();
            if (originalImageUrl) {
                const restoredImg = document.createElement('img');
                restoredImg.src = originalImageUrl;
                restoredImg.alt = 'Post Image';
                restoredImg.style.maxWidth = '400px';
                restoredImg.style.maxHeight = '300px';
                restoredImg.style.marginRight = '10px';

                const currentImg = contentContainer.querySelector('img');
                if (currentImg) {
                    currentImg.replaceWith(restoredImg);
                } else {
                    contentContainer.appendChild(restoredImg);
                }
            } else {
                const existingImg = contentContainer.querySelector('img');
                if (existingImg) existingImg.remove();
            }

            saveButton.replaceWith(button);
            cancelButton.remove();

            if (likeButton) {
                likeButton.style.display = 'inline-block';
            }
        };
    }

    // Reattach event handlers for edit buttons
    document.querySelectorAll('.edit-button').forEach(button => {
        button.onclick = handleEditButtonClick;
    });

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
});
