// generator-doc.js

// Firebase Modular SDK Imports
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Use the Firebase app initialized in generator.html
const auth = window.auth;
const db = window.db;

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
    onAuthStateChanged(auth, function(user) {
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
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .then(function(result) {
                console.log('User signed in:', result.user.displayName);
            })
            .catch(function(error) {
                console.error('Error during sign-in:', error);
                alert('Error during sign-in: ' + error.message);
            });
    });

    // Logout Button Click
    logoutButton.addEventListener('click', function() {
        signOut(auth)
            .then(function() {
                console.log('User signed out.');
            })
            .catch(function(error) {
                console.error('Error during sign-out:', error);
            });
    });

    // Feedback Button Click
    // (If you have feedback functionality, include it here)
}

// Function to handle input method toggle
function setupInputMethodToggle() {
    const codeSnippetOption = document.getElementById('codeSnippetOption');
    const githubFileOption = document.getElementById('githubFileOption');
    const codeSnippetInput = document.getElementById('codeSnippetInput');
    const githubFileInput = document.getElementById('githubFileInput');
    const contextLabel = document.getElementById('contextLabel');

    function toggleInputFields() {
        if (codeSnippetOption.checked) {
            codeSnippetInput.style.display = 'block';
            githubFileInput.style.display = 'none';
            contextLabel.innerText = 'Jira Ticket Details:';
            document.getElementById('code').required = true;
            document.getElementById('githubFileUrl').required = false;
        } else if (githubFileOption.checked) {
            codeSnippetInput.style.display = 'none';
            githubFileInput.style.display = 'block';
            contextLabel.innerText = 'Background and Context:';
            document.getElementById('code').required = false;
            document.getElementById('githubFileUrl').required = true;
        }
    }

    // Add event listeners
    codeSnippetOption.addEventListener('change', toggleInputFields);
    githubFileOption.addEventListener('change', toggleInputFields);

    // Initial call to set the correct state
    toggleInputFields();
}

// Existing code for document generation and copying
document.getElementById('doc-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const user = auth.currentUser;

    if (generationCount >= 1 && !user) {
        alert('Please sign in with Google to generate more documentation.');
        return;
    }

    // Determine the input method
    const inputMethod = document.querySelector('input[name="inputMethod"]:checked').value;

    let code = '';
    const jira = document.getElementById('jira').value;

    let githubFileUrl = '';

    if (inputMethod === 'codeSnippet') {
        code = document.getElementById('code').value;
    } else if (inputMethod === 'githubFile') {
        githubFileUrl = document.getElementById('githubFileUrl').value;

        // Validate inputs
        if (!githubFileUrl) {
            alert('Please provide the GitHub file URL.');
            return;
        }

        // No need to fetch code on client-side; send details to server
    }

    // Disable the submit button to prevent multiple submissions
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerText = 'Generating...';

    try {
        const response = await fetch('/api/generate-doc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, jira, inputMethod, githubFileUrl })
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
    setupInputMethodToggle();
};
