// generator-doc.js
// Firebase Auth & UI Management
const initAuth = () => {
    const auth = firebase.auth();
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const greeting = document.getElementById('user-greeting');

    auth.onAuthStateChanged(user => {
        if (user) {
            loginButton.style.display = 'none';
            logoutButton.style.display = 'inline-block';
            greeting.textContent = `👋 Hey ${user.displayName.split(' ')[0]}!`;
            localStorage.setItem('devdokUser', user.uid);
        } else {
            loginButton.style.display = 'inline-block';
            logoutButton.style.display = 'none';
            greeting.textContent = '';
            localStorage.removeItem('devdokUser');
        }
    });

    loginButton.addEventListener('click', () => handleGoogleLogin(auth));
    logoutButton.addEventListener('click', () => auth.signOut().catch(showError));
};

// Form Handling & Documentation Generation
const setupForm = () => {
    const form = document.getElementById('doc-form');
    const inputMethodToggles = document.querySelectorAll('input[name="inputMethod"]');
    
    form.addEventListener('submit', handleSubmit);
    inputMethodToggles.forEach(toggle => {
        toggle.addEventListener('change', toggleInputFields);
    });
};

// UI Helpers & Animations
const setupUI = () => {
    setupCopyButtons();
    setupFeedback();
    setupKeyboardShortcuts();
    addHoverEffects();
    toggleInputFields(); // Initial call
};

// Core Functions
const handleGoogleLogin = async (auth) => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        showError(`🔐 Login Failed: ${error.message}`);
    }
};

const handleSubmit = async (e) => {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    const user = firebase.auth().currentUser;
    
    if (!user && localStorage.getItem('generationCount') >= 1) {
        showError('🔑 Please sign in to continue generating docs!');
        return;
    }

    submitButton.innerHTML = '<span class="loading-spinner"></span> Generating...';
    submitButton.disabled = true;

    try {
        const formData = getFormData();
        validateFormData(formData);
        
        const response = await fetch('/api/generate-doc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (result.error) throw new Error(result.error);
        showResults(result.documentation);
        trackUsage(user);
    } catch (error) {
        showError(`🚨 Error: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Docs';
    }
};

// Helper Functions
const getFormData = () => ({
    code: document.getElementById('code').value,
    jira: document.getElementById('jira').value,
    githubFileUrl: document.getElementById('githubFileUrl').value,
    inputMethod: document.querySelector('input[name="inputMethod"]:checked').value
});

const validateFormData = ({ code, githubFileUrl, inputMethod }) => {
    if (inputMethod === 'codeSnippet' && !code.trim()) {
        throw new Error('Please enter some code! 🧑💻');
    }
    if (inputMethod === 'githubFile' && !githubFileUrl) {
        throw new Error('GitHub URL required! 🌐');
    }
};

const showResults = (documentation) => {
    document.getElementById('markdownContent').textContent = documentation;
    document.getElementById('renderedContent').innerHTML = marked.parse(documentation);
    $('#outputModal').modal('show');
};

const trackUsage = (user) => {
    const count = parseInt(localStorage.getItem('generationCount') || 0;
    localStorage.setItem('generationCount', count + 1);
    
    if (user) {
        firebase.firestore().collection('usage').doc(user.uid).set({
            lastUsed: firebase.firestore.FieldValue.serverTimestamp(),
            count: count + 1
        }, { merge: true });
    }
};

// UI Effects & Interactions
const setupCopyButtons = () => {
    const copyHandler = (content, statusElement) => {
        navigator.clipboard.writeText(content).then(() => {
            statusElement.style.display = 'inline';
            setTimeout(() => statusElement.style.display = 'none', 2000);
        }).catch(() => showError('📋 Clipboard access denied!'));
    };

    document.getElementById('copyMarkdownButton').addEventListener('click', () => {
        copyHandler(document.getElementById('markdownContent').textContent, 
                   document.getElementById('markdownStatus'));
    });

    document.getElementById('copyRenderedButton').addEventListener('click', () => {
        copyHandler(document.getElementById('renderedContent').innerHTML, 
                   document.getElementById('renderedStatus'));
    });
};

const setupFeedback = () => {
    const feedbackForm = document.getElementById('feedback-form');
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        const feedback = document.getElementById('feedback-text').value.trim();

        if (!feedback) return showError('📝 Please write some feedback first!');
        
        try {
            await firebase.firestore().collection('feedback').add({
                uid: user?.uid || 'anonymous',
                feedback,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            $('#feedbackModal').modal('hide');
            showSuccess('💖 Thanks for your feedback!');
            feedbackForm.reset();
        } catch (error) {
            showError(`📮 Failed to send feedback: ${error.message}`);
        }
    });
};

// Error Handling
const showError = (message) => {
    const errorHtml = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="close" data-dismiss="alert">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', errorHtml);
};

const showSuccess = (message) => {
    const successHtml = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="close" data-dismiss="alert">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', successHtml);
};

// Input Field Toggle
const toggleInputFields = () => {
    const isCodeSnippet = document.getElementById('codeSnippetOption').checked;
    document.getElementById('codeSnippetInput').style.display = isCodeSnippet ? 'block' : 'none';
    document.getElementById('githubFileInput').style.display = isCodeSnippet ? 'none' : 'block';
    document.getElementById('contextLabel').innerHTML = isCodeSnippet 
        ? '<i class="fas fa-comment-dots me-2"></i>Code Context (optional):' 
        : '<i class="fas fa-info-circle me-2"></i>File Context (optional):';
};

// Keyboard Shortcuts
const setupKeyboardShortcuts = () => {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            document.getElementById('doc-form').requestSubmit();
        }
    });
};

// Initialization
window.addEventListener('DOMContentLoaded', () => {
    initAuth();
    setupForm();
    setupUI();
});
