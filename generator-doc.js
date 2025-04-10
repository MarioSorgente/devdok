/* generator-doc.js */

// Track generation counts to limit non-authenticated users
let generationCount = 0;

/**
 * Retry helper: Attempts the fetch call up to "retryCount" times.
 * @param {string} url - API endpoint.
 * @param {object} options - Options for fetch.
 * @param {number} retryCount - Number of attempts (default 2).
 * @returns {object} - The API result if successful.
 */
async function fetchWithRetry(url, options, retryCount = 2) {
  let lastError;
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const response = await fetch(url, options);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error in API response');
      }
      return result;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error);
      // Optionally add delay between attempts here if needed
    }
  }
  throw lastError;
}

/**
 * Sets up Firebase authentication and feedback handling.
 */
function setupAuthAndFeedback() {
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  const feedbackButton = document.getElementById('feedback-button');
  const feedbackModal = $('#feedbackModal');
  const feedbackForm = document.getElementById('feedback-form');
  const feedbackText = document.getElementById('feedback-text');

  // Listen for authentication state changes
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      loginButton.style.display = 'none';
      logoutButton.style.display = 'inline-block';
      console.log('User signed in:', user.displayName);
    } else {
      loginButton.style.display = 'inline-block';
      logoutButton.style.display = 'none';
      console.log('No user signed in.');
    }
  });

  // Handle login with Google
  loginButton.addEventListener('click', function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
      .then(function(result) {
        console.log('User signed in:', result.user.displayName);
      })
      .catch(function(error) {
        console.error('Error during sign-in:', error);
        alert('Error during sign-in: ' + error.message);
      });
  });

  // Handle logout
  logoutButton.addEventListener('click', function() {
    firebase.auth().signOut()
      .then(function() {
        console.log('User signed out.');
      })
      .catch(function(error) {
        console.error('Error during sign-out:', error);
      });
  });

  // Show feedback modal if signed in; otherwise alert the user
  feedbackButton.addEventListener('click', function() {
    if (firebase.auth().currentUser) {
      feedbackModal.modal('show');
    } else {
      alert('Please sign in with Google to send feedback.');
    }
  });

  // Handle feedback submission
  feedbackForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const feedback = feedbackText.value.trim();
    const user = firebase.auth().currentUser;

    if (user && feedback) {
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

/**
 * Sets up the toggle between the Code Snippet and GitHub File input methods.
 */
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
      contextLabel.innerText = 'General Context:';
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

  codeSnippetOption.addEventListener('change', toggleInputFields);
  githubFileOption.addEventListener('change', toggleInputFields);
  toggleInputFields();
}

/**
 * Handles document generation on form submission.
 */
document.getElementById('doc-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const user = firebase.auth().currentUser;

  // Limit additional generations for non-authenticated users
  if (generationCount >= 1 && !user) {
    alert('Please sign in with Google to generate more documentation.');
    return;
  }

  const inputMethod = document.querySelector('input[name="inputMethod"]:checked').value;
  let code = '';
  const jira = document.getElementById('jira').value;
  let githubFileUrl = '';

  if (inputMethod === 'codeSnippet') {
    code = document.getElementById('code').value;
  } else if (inputMethod === 'githubFile') {
    githubFileUrl = document.getElementById('githubFileUrl').value;
    if (!githubFileUrl) {
      alert('Please provide the GitHub file URL.');
      return;
    }
  }

  // Disable the submit button to prevent multiple submissions
  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.innerText = 'Generating...';

  try {
    const payload = { code, jira, inputMethod, githubFileUrl };

    // Use the retry-enabled fetch call (2 attempts)
    const result = await fetchWithRetry('/api/generate-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 2);

    if (result.documentation) {
      generationCount++;
      document.getElementById('markdownContent').innerText = result.documentation;
      document.getElementById('renderedContent').innerHTML = marked.parse(result.documentation);
      $('#outputModal').modal('show');
    } else if (result.error) {
      alert('Error: ' + result.error);
    } else {
      alert('An unexpected error occurred.');
    }
  } catch (error) {
    console.error('Error during generation:', error);
    alert('Error generating documentation.');
  } finally {
    submitButton.disabled = false;
    submitButton.innerText = 'Generate';
  }
});

/**
 * Copy the generated Markdown content to the clipboard.
 */
document.getElementById('copyMarkdownButton').addEventListener('click', function() {
  const markdownText = document.getElementById('markdownContent').innerText;
  navigator.clipboard.writeText(markdownText)
    .then(function() {
      document.getElementById('markdownStatus').style.display = 'inline';
      setTimeout(() => {
        document.getElementById('markdownStatus').style.display = 'none';
      }, 2000);
    })
    .catch(function(err) {
      console.error('Could not copy Markdown:', err);
      alert('Failed to copy Markdown.');
    });
});

/**
 * Copy the rendered HTML content to the clipboard.
 */
document.getElementById('copyRenderedButton').addEventListener('click', function() {
  const renderedContent = document.getElementById('renderedContent').innerHTML;
  const tempTextarea = document.createElement('textarea');
  tempTextarea.value = renderedContent;
  document.body.appendChild(tempTextarea);
  tempTextarea.select();
  try {
    document.execCommand('copy');
    document.getElementById('renderedStatus').style.display = 'inline';
    setTimeout(() => {
      document.getElementById('renderedStatus').style.display = 'none';
    }, 2000);
  } catch (err) {
    console.error('Could not copy rendered content:', err);
    alert('Failed to copy rendered content.');
  }
  document.body.removeChild(tempTextarea);
});

/**
 * Clears the modal content when closed.
 */
document.getElementById('modalCloseButton').addEventListener('click', function() {
  document.getElementById('markdownContent').innerText = '';
  document.getElementById('renderedContent').innerHTML = '';
});

// Initialize authentication, input toggling, and related functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setupAuthAndFeedback();
  setupInputMethodToggle();
});
