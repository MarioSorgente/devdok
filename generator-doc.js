document.getElementById('doc-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const code = document.getElementById('code').value;
    const jira = document.getElementById('jira').value;
    document.getElementById('output').innerText = 'Generating documentation...';

    const response = await fetch('/api/generate-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, jira })
    });

    const result = await response.json();
    if (result.documentation) {
        document.getElementById('output').innerText = result.documentation;
    } else {
        document.getElementById('output').innerText = 'Error generating documentation.';
    }
});
