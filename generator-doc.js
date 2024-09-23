// generator-doc.js

let generationCount = 0; // Variable to track the number of generations

// Firebase Authentication and Feedback
function setupAuthAndFeedback() {
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const feedbackButton = document.getElementById('feedback-button');
    const feedbackModal = $('#feedbackModal');
    const feedbackForm = document.getElementById('feedback-form');
    const feedbackText = document.getElementById('feedback-text');

    // Authentication State Observer
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in
            loginButton.style.display = 'none';
            logoutButton.style.display = 'inline-block';
            console.log('User signed in:', user.displayName);
        } else {
            // No user is signed in
            loginButton.style.display = 'inline-block';
            logoutButton.style.display = 'none';
            console.log('No user signed in.');
        }
    });

    // Login Button Click
    loginButton.addEventListener('click', function() {
        var provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider).then(function(result) {
            console.log('User signed in:', result.user.displayName);
        }).catch(function(error) {
            console.error('Error during sign-in:', error);
        });
    });

    // Logout Button Click
    logoutButton.addEventListener('click', function() {
        firebase.auth().signOut().then(function() {
            console.log('User signed out.');
        }).catch(function(error) {
            console.error('Error during sign-out:', error);
        });
    });

    // Feedback Button Click
    feedbackButton.addEventListener('click', function() {
        // Check if user is signed in
        if (firebase.auth().currentUser) {
            feedbackModal.modal('show');
        } else {
            alert('Please sign in with Google to send feedback.');
        }
    });

    // Feedback Form Submission
    feedbackForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const feedback = feedbackText.value.trim();
        const user = firebase.auth().currentUser;

        if (user && feedback) {
            // Save feedback to Firestore
            firebase.firestore().collection('feedback').add({
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                feedback: feedback,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(function() {
                alert('Thank you for your feedback!');
                feedbackText.value = '';
                feedbackModal.modal('hide');
            })
            .catch(function(error) {
                console.error('Error submitting feedback:', error);
                alert('Error submitting feedback. Please try again later.');
            });
        } else {
            alert('Please enter your feedback.');
        }
    });
}

// Existing code for document generation and copying
document.getElementById('doc-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const user = firebase.auth().currentUser;

    if (generationCount >= 1 && !user) {
        alert('Please sign in with Google to generate more documentation.');
        return;
    }

    const code = document.getElementById('code').value;
    const jira = document.getElementById('jira').value;

    // Disable the submit button to prevent multiple submissions
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerText = 'Generating...';

    try {
        const response = await fetch('/api/generate-doc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, jira })
        });

        const result = await response.json();

        if (result.documentation) {
            // Increment generation count
            generationCount++;

            // Populate the modal panes
            document.getElementById('markdownContent').innerText = result.documentation;
            document.getElementById('renderedContent').innerHTML = marked.parse(result.documentation);

            // Show the modal
            $('#outputModal').modal('show');
        } else if (result.error) {
            alert('Error: ' + result.error);
        } else {
            alert('An unexpected error occurred.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error generating documentation.');
    } finally {
        // Re-enable the submit button
        submitButton.disabled = false;
        submitButton.innerText = 'Generate';
    }
});

// Copy Markdown to Clipboard
document.getElementById('copyMarkdownButton').addEventListener('click', function() {
    const markdownText = document.getElementById('markdownContent').innerText;
    navigator.clipboard.writeText(markdownText).then(function() {
        // Show success message
        document.getElementById('markdownStatus').style.display = 'inline';
        setTimeout(() => {
            document.getElementById('markdownStatus').style.display = 'none';
        }, 2000);
    }, function(err) {
        console.error('Could not copy text: ', err);
        alert('Failed to copy Markdown.');
    });
});

// Copy Rendered HTML to Clipboard
document.getElementById('copyRenderedButton').addEventListener('click', function() {
    const renderedContent = document.getElementById('renderedContent').innerHTML;
    // Create a temporary textarea to copy HTML
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = renderedContent;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    try {
        document.execCommand('copy');
        // Show success message
        document.getElementById('renderedStatus').style.display = 'inline';
        setTimeout(() => {
            document.getElementById('renderedStatus').style.display = 'none';
        }, 2000);
    } catch (err) {
        console.error('Could not copy text: ', err);
        alert('Failed to copy rendered content.');
    }
    document.body.removeChild(tempTextarea);
});

// Close the modal and clear content
document.getElementById('modalCloseButton').addEventListener('click', function() {
    // Clear content if needed
    document.getElementById('markdownContent').innerText = '';
    document.getElementById('renderedContent').innerHTML = '';
});

// Initialize Authentication and Feedback when the page loads
window.onload = function() {
    setupAuthAndFeedback();
};
