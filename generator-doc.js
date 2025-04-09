// generator-doc.js
// Firebase Initialization
const auth = firebase.auth();
const db = firebase.firestore();

// UI Elements
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const form = document.getElementById('doc-form');
const codeSnippetOption = document.getElementById('codeSnippetOption');
const githubFileOption = document.getElementById('githubFileOption');

// State Management
let generationCount = localStorage.getItem('generationCount') || 0;

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

// Handle Input Toggle
function toggleInputFields() {
    const isCodeSnippet = codeSnippetOption.checked;
    
    document.getElementById('codeSnippetInput').style.display = isCodeSnippet ? 'block' : 'none';
    document.getElementById('githubFileInput').style.display = isCodeSnippet ? 'none' : 'block';
    
    // Force redraw for transition
    document.getElementById('codeSnippetInput').classList.add('fade-in');
    document.getElementById('githubFileInput').classList.add('fade-in');
}

// Handle Form Submission
async function handleSubmit(e) {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const user = auth.currentUser;

    try {
        // Validate authentication
        if (generationCount >= 1 && !user) {
            showError('🔒 Please sign in to continue generating documentation');
            return;
        }

        // Get form data
        const formData = {
            code: document.getElementById('code').value,
            jira: document.getElementById('jira').value,
            githubFileUrl: document.getElementById('githubFileUrl').value,
            inputMethod: document.querySelector('input[name="inputMethod"]:checked').value
        };

        // Validate inputs
        if (formData.inputMethod === 'codeSnippet' && !formData.code.trim()) {
            throw new Error('Please enter some code! 🧑💻');
        }
        if (formData.inputMethod === 'githubFile' && !formData.githubFileUrl) {
            throw new Error('Please provide a GitHub URL! 🌐');
        }

        // Disable button
        submitButton.innerHTML = '<div class="loading-spinner"></div> Generating...';
        submitButton.disabled = true;

        // API call
        const response = await fetch('/api/generate-doc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('API request failed');
        const result = await response.json();

        if (result.error) throw new Error(result.error);
        
        // Show results
        document.getElementById('markdownContent').textContent = result.documentation;
        document.getElementById('renderedContent').innerHTML = marked.parse(result.documentation);
        $('#outputModal').modal('show');
        
        // Update usage
        generationCount++;
        localStorage.setItem('generationCount', generationCount);
        if (user) db.collection('usage').doc(user.uid).update({ count: generationCount });

    } catch (error) {
        showError(`🚨 Error: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-magic me-2"></i> Generate Docs';
    }
}

// Copy Handlers
function setupCopyButtons() {
    document.getElementById('copyMarkdownButton').addEventListener('click', () => {
        navigator.clipboard.writeText(document.getElementById('markdownContent').textContent)
            .then(() => showTempMessage('markdownStatus'))
            .catch(() => showError('Failed to copy Markdown'));
    });

    document.getElementById('copyRenderedButton').addEventListener('click', () => {
        const htmlContent = document.getElementById('renderedContent').innerHTML;
        navigator.clipboard.writeText(htmlContent)
            .then(() => showTempMessage('renderedStatus'))
            .catch(() => showError('Failed to copy HTML'));
    });
}

// Feedback Handler
function setupFeedback() {
    document.getElementById('feedback-button').addEventListener('click', () => {
        if (!auth.currentUser) {
            showError('🔐 Please sign in to submit feedback');
            return;
        }
        $('#feedbackModal').modal('show');
    });

    document.getElementById('feedback-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const feedbackText = document.getElementById('feedback-text').value.trim();
        
        if (!feedbackText) {
            showError('📝 Please write some feedback first');
            return;
        }

        try {
            await db.collection('feedback').add({
                uid: auth.currentUser.uid,
                feedback: feedbackText,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            showSuccess('🎉 Thanks for your feedback!');
            $('#feedbackModal').modal('hide');
        } catch (error) {
            showError(`📮 Failed to submit feedback: ${error.message}`);
        }
    });
}

// UI Helpers
function showError(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show';
    alert.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert">
            <span aria-hidden="true">&times;</span>
        </button>
    `;
    document.body.prepend(alert);
}

function showSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show';
    alert.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert">
            <span aria-hidden="true">&times;</span>
        </button>
    `;
    document.body.prepend(alert);
}

function showTempMessage(elementId) {
    const element = document.getElementById(elementId);
    element.style.display = 'inline';
    setTimeout(() => element.style.display = 'none', 2000);
}

// Initialize App
function initApp() {
    initAuth();
    setupCopyButtons();
    setupFeedback();
    
    // Event Listeners
    codeSnippetOption.addEventListener('change', toggleInputFields);
    githubFileOption.addEventListener('change', toggleInputFields);
    form.addEventListener('submit', handleSubmit);
    
    // Keyboard Shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            form.requestSubmit();
        }
    });
}

// Start Application
window.addEventListener('DOMContentLoaded', initApp);
