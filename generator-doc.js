document.getElementById('doc-form').addEventListener('submit', async function(e) {
    e.preventDefault();
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
document.getElementById('copyButton').addEventListener('click', function() {
    const markdownText = document.getElementById('markdownContent').innerText;
    navigator.clipboard.writeText(markdownText).then(function() {
        alert('Markdown copied to clipboard!');
    }, function(err) {
        console.error('Could not copy text: ', err);
    });
});

// Optional: Close the modal and clear content
document.getElementById('modalCloseButton').addEventListener('click', function() {
    // Clear content if needed
    document.getElementById('markdownContent').innerText = '';
    document.getElementById('renderedContent').innerHTML = '';
});
