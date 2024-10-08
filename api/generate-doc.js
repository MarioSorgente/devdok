// api/generate-doc.js

const fetch = require('node-fetch');

const openai_api_key = process.env.OPENAI_API_KEY;
const github_access_token = process.env.GITHUB_ACCESS_TOKEN; // From Vercel environment variables

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.status(405).send({ message: 'Only POST requests allowed' });
    return;
  }

  let { code, jira, inputMethod, githubFileUrl } = req.body;

  // If inputMethod is 'githubFile', fetch code from GitHub
  if (inputMethod === 'githubFile') {
    try {
      code = await fetchCodeFromGitHubFile(githubFileUrl);
    } catch (error) {
      console.error('Error fetching code from GitHub:', error);
      res.status(500).json({ error: 'Failed to fetch code from GitHub.' });
      return;
    }
  }

  // Check if the code exceeds token limits
  const maxCodeLength = 15000; // Adjust based on OpenAI API token limits
  if (code.length > maxCodeLength) {
    res.status(400).json({ error: 'The selected code is too large to process. Please select a smaller file or code snippet.' });
    return;
  }

  const prompt = `
You are a developer reviewing the following code snippet or file. Based on the code and any provided context, generate documentation in **Markdown format compatible with Notion**.

**Instructions:**
- **Title:** Provide a clear and descriptive title.
- **Summary:** Write a brief overview of what the code does.
- **Key Components:**
  - Explain main functions, classes, or methods and everything a developer of Google would document, without making unsupported assumptions.
- **Formatting:**
  - Use clear headings and bullet points.
  - Include code snippets if they aid understanding.
-**Note:** 
  - If the code lacks comments or is part of a larger project, please highlight the parts that need additional context or explanations to improve the accuracy of the documentation.


**Code Snippet:**
\`\`\`
function calculateSum(a, b) {
  return a + b;
}
\`\`\`

**Context:**
This function is part of a utility library for mathematical operations.

Provide the documentation below:


**Code Snippet:**
\`\`\`
${code}
\`\`\`

**Context Details:**
${jira}

Provide the documentation below:
`;

  try {
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openai_api_key}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo-16k',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for generating code documentation.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      })
    });

    const data = await completion.json();

    if (completion.ok) {
      const documentation = data.choices[0].message.content.trim();
      res.status(200).json({ documentation });
    } else {
      console.error('OpenAI API error:', data);
      res.status(500).json({ error: 'Error from OpenAI API', details: data });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error generating documentation', details: error.message });
  }
};

// Function to fetch code from a GitHub file URL
async function fetchCodeFromGitHubFile(fileUrl) {
  // Convert the GitHub file URL to a raw file URL
  const rawUrl = fileUrl
    .replace('github.com', 'raw.githubusercontent.com')
    .replace('/blob/', '/');

  // Headers for the request
  const headers = {};

  // Include personal access token if available
  if (github_access_token) {
    headers['Authorization'] = `token ${github_access_token}`;
  }

  try {
    const response = await fetch(rawUrl, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`GitHub raw content error: ${response.statusText}`);
    }

    const code = await response.text();

    // Check file size (assuming UTF-8 encoding)
    const fileSizeInBytes = Buffer.byteLength(code, 'utf8');
    const maxFileSize = 50 * 1024; // 50KB

    if (fileSizeInBytes > maxFileSize) {
      throw new Error('File size exceeds 100KB limit.');
    }

    return code;
  } catch (error) {
    throw error;
  }
}
