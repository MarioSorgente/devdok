// generator-doc.js

let generationCount = 0; // Track how many times user has generated

function setupAuthAndFeedback() {
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  const feedbackButton = document.getElementById('feedback-button');
  const feedbackModal = $('#feedbackModal');
  const feedbackForm = document.getElementById('feedback-form');
  const feedbackText = document.getElementById('feedback-text');

  // Observe Firebase auth state
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      loginButton.style.display = 'none';
      logoutButton.style.display = 'inline-block';
    } else {
      loginButton.style.display = 'inline-block';
      logoutButton.style.display = 'none';
    }
  });

  // Login with Google
  loginButton.addEventListener('click', function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(function(error) {
      console.error('Error during sign-in:', error);
      alert('Error during sign-in: ' + error.message);
    });
  });

  // Logout
  logoutButton.addEventListener('click', function() {
    firebase.auth().signOut().catch(function(error) {
      console.error('Error during sign-out:', error);
    });
  });

  // Feedback Button => open the Feedback Modal if authenticated
  feedbackButton.addEventListener('click', function() {
    if (firebase.auth().currentUser) {
      feedbackModal.modal('show');
    } else {
      alert('Please sign in with Google to send feedback.');
    }
  });

  // Feedback Form Submit
  feedbackForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const feedback = feedbackText.value.trim();
    const user = firebase.auth().currentUser;

    if (!user) {
      alert('Please sign in to send feedback.');
      return;
    }
    if (!feedback) {
      alert('Please enter feedback.');
      return;
    }

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
  });
}

// Toggle between Code Snippet and GitHub File
function setupInputMethodToggle() {
  const codeSnippetOption = document.getElementById('codeSnippetOption');
  const githubFileOption = document.getElementById('githubFileOption');
  const codeSnippetInput = document.getElementById('codeSnippetInput');
  const githubFileInput = document.getElementById('githubFileInput');
  const contextLabel = document.getElementById('contextLabel');
  const codeField = document.getElementById('code');
  const githubField = document.getElementById('githubFileUrl');

  function toggleFields() {
    if (codeSnippetOption.checked) {
      codeSnippetInput.style.display = 'block';
      githubFileInput.style.display = 'none';
      contextLabel.innerText = 'Jira Ticket Details:';
      codeField.required = true;
      githubField.required = false;
    } else {
      codeSnippetInput.style.display = 'none';
      githubFileInput.style.display = 'block';
      contextLabel.innerText = 'Background and Context:';
      codeField.required = false;
      githubField.required = true;
    }
  }

  [codeSnippetOption, githubFileOption].forEach(radio => {
    radio.addEventListener('change', toggleFields);
    radio.addEventListener('click', toggleFields);
  });

  toggleFields(); // Set initial state
}

// Form submission => call /api/generate-doc
async function handleFormSubmit(e) {
  e.preventDefault();

  const user = firebase.auth().currentUser;
  const inputMethod = document.querySelector('input[name="inputMethod"]:checked').value;
  const jira = document.getElementById('jira').value;
  const code = document.getElementById('code').value;
  const githubFileUrl = document.getElementById('githubFileUrl').value;

  // Limit generation if user not logged in
  if (!user && generationCount >= 1) {
    alert('Please sign in with Google to generate more documentation.');
    return;
  }

  // Submit button logic
  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

  try {
    const response = await fetch('/api/generate-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, jira, inputMethod, githubFileUrl })
    });

    let result;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      result = await response.json();
    } else {
      // If the server didn't return JSON, parse text for debugging
      const text = await response.text();
      throw new Error('Non-JSON response: ' + text);
    }

    if (result.error) {
      alert('Error: ' + result.error);
    } else if (result.documentation) {
      generationCount++;
      // Fill the side-by-side fields
      document.getElementById('markdownContent').innerText = result.documentation;
      document.getElementById('renderedContent').innerHTML = marked.parse(result.documentation);
    } else {
      alert('An unexpected error occurred. No documentation returned.');
    }
  } catch (error) {
    console.error('Error generating documentation:', error);
    alert('Error generating documentation. Check console for details.');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-magic mr-1"></i> Generate';
  }
}

// Copy Buttons
function setupCopyButtons() {
  const copyMarkdownButton = document.getElementById('copyMarkdownButton');
  const copyRenderedButton = document.getElementById('copyRenderedButton');

  copyMarkdownButton.addEventListener('click', function() {
    const text = document.getElementById('markdownContent').innerText;
    navigator.clipboard.writeText(text).then(() => {
      document.getElementById('markdownStatus').style.display = 'inline';
      setTimeout(() => {
        document.getElementById('markdownStatus').style.display = 'none';
      }, 1500);
    }).catch(err => {
      console.error('Could not copy text:', err);
      alert('Failed to copy Markdown.');
    });
  });

  copyRenderedButton.addEventListener('click', function() {
    const html = document.getElementById('renderedContent').innerHTML;
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = html;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    try {
      document.execCommand('copy');
      document.getElementById('renderedStatus').style.display = 'inline';
      setTimeout(() => {
        document.getElementById('renderedStatus').style.display = 'none';
      }, 1500);
    } catch (err) {
      console.error('Could not copy text:', err);
      alert('Failed to copy rendered content.');
    }
    document.body.removeChild(tempTextarea);
  });
}

// Initialize everything on page load
window.onload = function() {
  setupAuthAndFeedback();
  setupInputMethodToggle();
  setupCopyButtons();

  // Form submission handler
  document.getElementById('doc-form').addEventListener('submit', handleFormSubmit);
};
