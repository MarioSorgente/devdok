// generator-doc.js

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

// Copy Rendered HTML to Clipboard (Ready for Notion)
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
        alert('Failed to copy for Notion.');
    }
    document.body.removeChild(tempTextarea);
});

// Optional: Close the modal and clear content
document.getElementById('modalCloseButton').addEventListener('click', function() {
    // Clear content if needed
    document.getElementById('markdownContent').innerText = '';
    document.getElementById('renderedContent').innerHTML = '';
});
