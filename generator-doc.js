/* generator-doc.js */

// Firebase Initialization
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const form = document.getElementById('doc-form');
const codeSnippetOption = document.getElementById('codeSnippetOption');
const githubFileOption = document.getElementById('githubFileOption');

// Helper: Show error messages (this can be replaced with a more robust notification system)
function showError(message) {
    alert(message);
}

// Helper: Copy Markdown content to clipboard
function copyMarkdown() {
    const markdownText = document.getElementById('markdownContent').textContent;
    navigator.clipboard.writeText(markdownText)
        .then(() => alert("Markdown content copied to clipboard!"))
        .catch(err => alert("Error copying Markdown content: " + err));
}

// Helper: Copy Rendered content to clipboard
function copyRendered() {
    const renderedText = document.getElementById('renderedContent').innerText;
    navigator.clipboard.writeText(renderedText)
        .then(() => alert("Rendered content copied to clipboard!"))
        .catch(err => alert("Error copying rendered content: " + err));
}

// Helper: Open Feedback Modal
function handleFeedback() {
    $('#feedbackModal').modal('show');
}

// Initialize Authentication
function initAuth() {
    auth.onAuthStateChanged(user => {
        if (user) {
            loginButton.style.display = 'none';
            logoutButton.style.display = 'inline-block';
            document.getElementById('user-greeting').textContent = `👋 ${user.displayName.split(' ')[0]}`;
        } else {
            loginButton.style.display = 'inline-block';
            logoutButton.style.display = 'none';
            document.getElementById('user-greeting').textContent = '';
        }
    });

    loginButton.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(showError);
    });

    logoutButton.addEventListener('click', () => auth.signOut());
}

// Toggle Input Fields: switches between code snippet and GitHub file URL inputs
function toggleInputFields() {
    const isCodeSnippet = codeSnippetOption.checked;
    document.getElementById('codeSnippetInput').classList.toggle('d-none', !isCodeSnippet);
    document.getElementById('githubFileInput').classList.toggle('d-none', isCodeSnippet);
    document.getElementById('codeSnippetLabel').classList.toggle('active', isCodeSnippet);
    document.getElementById('githubFileLabel').classList.toggle('active', !isCodeSnippet);
}

// Form Submission: Validate inputs, call API, and display documentation
async function handleSubmit(e) {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const user = auth.currentUser;

    try {
        // Require login if already generated documentation once
        if (!user && (parseInt(localStorage.getItem('generationCount') || '0') >= 1)) {
            showError('🔒 Please sign in to continue');
            return;
        }

        // Build form data
        const formData = {
            code: document.getElementById('code').value,
            jira: document.getElementById('jira').value,
            githubFileUrl: document.getElementById('githubFileUrl').value,
            inputMethod: document.querySelector('input[name="inputMethod"]:checked').value
        };

        // Validate fields based on selected input method
        if (formData.inputMethod === 'codeSnippet' && !formData.code.trim()) {
            throw new Error('Please enter code! 🧑💻');
        }
        if (formData.inputMethod === 'githubFile' && !formData.githubFileUrl.trim()) {
            throw new Error('GitHub URL required! 🌐');
        }

        // Disable button and show loading indicator
        submitButton.innerHTML = '<div class="loading-spinner"></div> Generating...';
        submitButton.disabled = true;

        // API call to generate documentation
        const response = await fetch('/api/generate-doc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        let result;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            result = await response.json();
        } else {
            const text = await response.text();
            throw new Error("Non-JSON response: " + text);
        }

        if (result.error) throw new Error(result.error);

        // Display generated documentation (Markdown and rendered preview)
        document.getElementById('markdownContent').textContent = result.documentation;
        document.getElementById('renderedContent').innerHTML = marked.parse(result.documentation);
        $('#outputModal').modal('show');

        // Track usage in local storage and update Firebase (if logged in)
        localStorage.setItem('generationCount', parseInt(localStorage.getItem('generationCount') || '0') + 1);
        if (user) {
            db.collection('usage').doc(user.uid).update({
                count: firebase.firestore.FieldValue.increment(1)
            });
        }
    } catch (error) {
        showError(`🚨 Error: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-magic mr-2"></i> Generate Documentation';
    }
}

// Initialize App: sets up authentication and event listeners
function initApp() {
    initAuth();
    setupEventListeners();
    toggleInputFields(); // Set initial state based on default selection
}

// Attach event listeners
function setupEventListeners() {
    // Listen for both "change" and "click" events to ensure toggling works
    document.querySelectorAll('input[name="inputMethod"]').forEach(input => {
        input.addEventListener('change', toggleInputFields);
        input.addEventListener('click', toggleInputFields);
    });
    form.addEventListener('submit', handleSubmit);
    
    // Copy buttons
    document.getElementById('copyMarkdownButton').addEventListener('click', copyMarkdown);
    document.getElementById('copyRenderedButton').addEventListener('click', copyRendered);
    
    // Feedback
    document.getElementById('feedback-button').addEventListener('click', handleFeedback);
}

// Start the application when the DOM is ready
window.addEventListener('DOMContentLoaded', initApp);
