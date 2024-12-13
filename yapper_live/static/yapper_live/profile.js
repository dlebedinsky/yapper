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

    // Function to handle like button click
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

    // Function to handle edit button click
    function handleEditButtonClick(event) {
        const button = event.target;
        const postDiv = button.closest('.post');
        const postId = postDiv.dataset.postId;
        const postContentP = postDiv.querySelector('.post-content');
        const originalContent = postContentP.innerText;
        const username = document.querySelector('h2').innerText;

        // Create a textarea for editing
        const textarea = document.createElement('textarea');
        textarea.className = 'form-control';
        textarea.value = originalContent;

        // Create a save button
        const saveButton = document.createElement('button');
        saveButton.className = 'btn btn-sm btn-outline-primary mt-2';
        saveButton.innerText = 'Save';
        saveButton.dataset.postId = postId;

        // Replace the post content with the textarea and save button
        postContentP.replaceWith(textarea);
        button.replaceWith(saveButton);

        // Handle save button click
        saveButton.onclick = function() {
            const newContent = textarea.value;
            console.log("New content: " + newContent);
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
            if (!csrfToken) {
                console.error('CSRF token not found');
                return;
            }
            fetch(`/profile/${username}/edit_post/${postId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    content: newContent
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                }
            })
            .then(response => {
                console.log(response);
                return response.json();
            })
            .then(result => {
                console.log(result);
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
            })
            .catch(error => {
                console.error('Error:', error);
            });
        };
    }

    // Select all edit buttons
    document.querySelectorAll('.edit-button').forEach(button => {
        button.onclick = handleEditButtonClick;
    });
});
