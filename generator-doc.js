// Firebase Initialization
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const form = document.getElementById('doc-form');
const codeSnippetOption = document.getElementById('codeSnippetOption');
const githubFileOption = document.getElementById('githubFileOption');

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

// Toggle Input Fields
function toggleInputFields() {
    const isCodeSnippet = codeSnippetOption.checked;
    
    // Toggle visibility
    document.getElementById('codeSnippetInput').classList.toggle('d-none', !isCodeSnippet);
    document.getElementById('githubFileInput').classList.toggle('d-none', isCodeSnippet);
    
    // Update button states
    document.getElementById('codeSnippetLabel').classList.toggle('active', isCodeSnippet);
    document.getElementById('githubFileLabel').classList.toggle('active', !isCodeSnippet);
}

// Form Submission
async function handleSubmit(e) {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const user = auth.currentUser;

    try {
        // Validate authentication
        if (!user && localStorage.getItem('generationCount') >= 1) {
            showError('🔒 Please sign in to continue');
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
            throw new Error('Please enter code! 🧑💻');
        }
        if (formData.inputMethod === 'githubFile' && !formData.githubFileUrl) {
            throw new Error('GitHub URL required! 🌐');
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

        const result = await response.json();
        if (result.error) throw new Error(result.error);
        
        // Show results
        document.getElementById('markdownContent').textContent = result.documentation;
        document.getElementById('renderedContent').innerHTML = marked.parse(result.documentation);
        $('#outputModal').modal('show');
        
        // Track usage
        localStorage.setItem('generationCount', parseInt(localStorage.getItem('generationCount') || 0) + 1);
        if (user) db.collection('usage').doc(user.uid).update({ count: firebase.firestore.FieldValue.increment(1) });

    } catch (error) {
        showError(`🚨 Error: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-magic mr-2"></i> Generate Documentation';
    }
}

// Initialize App
function initApp() {
    initAuth();
    setupEventListeners();
    toggleInputFields(); // Initial state
}

// Event Listeners
function setupEventListeners() {
    codeSnippetOption.addEventListener('change', toggleInputFields);
    githubFileOption.addEventListener('change', toggleInputFields);
    form.addEventListener('submit', handleSubmit);
    
    // Copy buttons
    document.getElementById('copyMarkdownButton').addEventListener('click', copyMarkdown);
    document.getElementById('copyRenderedButton').addEventListener('click', copyRendered);
    
    // Feedback
    document.getElementById('feedback-button').addEventListener('click', handleFeedback);
}

// Start Application
window.addEventListener('DOMContentLoaded', initApp);
