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

function showError(message) {
    alert(message);
}

function copyMarkdown() {
    const markdownText = document.getElementById('markdownContent').textContent;
    navigator.clipboard.writeText(markdownText)
        .then(() => alert("Markdown content copied to clipboard!"))
        .catch(err => alert("Error copying Markdown content: " + err));
}

function copyRendered() {
    const renderedText = document.getElementById('renderedContent').innerText;
    navigator.clipboard.writeText(renderedText)
        .then(() => alert("Rendered content copied to clipboard!"))
        .catch(err => alert("Error copying rendered content: " + err));
}

function handleFeedback() {
    $('#feedbackModal').modal('show');
}

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

function toggleInputFields() {
    const codeSnippetInput = document.getElementById("codeSnippetInput");
    const githubFileInput = document.getElementById("githubFileInput");
    
    // Use the checked property of the radio inputs to show/hide corresponding sections
    if (githubFileOption.checked) {
        // Show the GitHub file URL input, hide code snippet input
        githubFileInput.classList.remove("d-none");
        codeSnippetInput.classList.add("d-none");
    } else {
        // Show the code snippet input, hide GitHub file URL input
        codeSnippetInput.classList.remove("d-none");
        githubFileInput.classList.add("d-none");
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const user = auth.currentUser;

    try {
        const formData = {
            code: document.getElementById('code').value,
            jira: document.getElementById('jira').value,
            githubFileUrl: document.getElementById('githubFileUrl').value.trim(),
            inputMethod: document.querySelector('input[name="inputMethod"]:checked').value
        };

        // Validate according to the selected input method
        if (formData.inputMethod === 'codeSnippet' && !formData.code.trim()) {
            throw new Error('Please enter code! 🧑💻');
        }
        if (formData.inputMethod === 'githubFile' && !formData.githubFileUrl) {
            throw new Error('GitHub URL required! 🌐');
        }

        // Disable the submit button and show loading spinner
        submitButton.innerHTML = '<div class="loading-spinner"></div> Generating...';
        submitButton.disabled = true;

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

        // Show the generated documentation in Markdown and rendered preview
        document.getElementById('markdownContent').textContent = result.documentation;
        document.getElementById('renderedContent').innerHTML = marked.parse(result.documentation);
        $('#outputModal').modal('show');

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

function setupEventListeners() {
    // Listen for changes on the radio inputs
    const radios = document.querySelectorAll('input[name="inputMethod"]');
    radios.forEach(radio => {
        radio.addEventListener('change', toggleInputFields);
    });
    form.addEventListener('submit', handleSubmit);
    document.getElementById('copyMarkdownButton').addEventListener('click', copyMarkdown);
    document.getElementById('copyRenderedButton').addEventListener('click', copyRendered);
    document.getElementById('feedback-button').addEventListener('click', handleFeedback);
}

function initApp() {
    initAuth();
    setupEventListeners();
    toggleInputFields(); // Set the initial state based on the default selection
}

window.addEventListener('DOMContentLoaded', initApp);
