// api/generate-doc.js

const fetch = require('node-fetch');

const openai_api_key = process.env.OPENAI_API_KEY;
const github_access_token = process.env.GITHUB_ACCESS_TOKEN; // From Vercel environment variables

/**
 * Helper function that wraps fetch in a retry mechanism.
 * Makes up to `retryCount` attempts.
 * @param {string} url - The API endpoint URL.
 * @param {object} options - Fetch options including method, headers, body, etc.
 * @param {number} retryCount - Maximum number of attempts (default is 2).
 * @returns {Promise<Response>} - The fetch response if successful.
 * @throws Will throw an error if all attempts fail.
 */
async function fetchWithRetry(url, options, retryCount = 2) {
  let lastError;
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error in API response');
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);
    }
  }
  throw lastError;
}

/**
 * Main API endpoint to generate documentation.
 */
module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Only POST requests allowed' });
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

  // Build the prompt for the OpenAI API call
  const prompt = `
You are a developer reviewing the following code snippet or file. Based on the code and any provided context, generate documentation in **Markdown format compatible with Notion**.

**Instructions:**
- **Title:** Provide a clear and descriptive title.
- **Summary:** Write a brief overview of what the code does.
- **Key Components:**
  - Explain main functions, classes, or methods and document key parts for other developers.
- **Formatting:**
  - Use clear headings and bullet points.
  - Include code snippets if they aid understanding.
- **Note:** 
  - If the code lacks comments or is part of a larger project, highlight areas that may need additional context.

**Code Snippet:**
\`\`\`
${code}
\`\`\`

**Context Details:**
${jira}

Provide the documentation below:
`;

  try {
    // Prepare the payload for the OpenAI API call.
    const payload = {
      model: 'gpt-4o-mini-2024-07-18',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for generating code documentation.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
      // Note: No explicit token limit is set.
    };

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openai_api_key}`
      },
      body: JSON.stringify(payload)
    };

    // Use the fetchWithRetry helper to call the OpenAI API with up to 2 attempts.
    const completionResponse = await fetchWithRetry('https://api.openai.com/v1/chat/completions', requestOptions, 2);
    const data = await completionResponse.json();

    // Send the generated documentation back to the client.
    const documentation = data.choices[0]?.message?.content?.trim();
    if (documentation) {
      res.status(200).json({ documentation });
    } else {
      console.error('OpenAI API error: No documentation generated.', data);
      res.status(500).json({ error: 'Error from OpenAI API', details: data });
    }
  } catch (error) {
    console.error('Error during documentation generation:', error);
    res.status(500).json({ error: 'Error generating documentation', details: error.message });
  }
};

/**
 * Function to fetch code from a GitHub file URL.
 * Converts the GitHub file URL to a raw URL and checks file size.
 * @param {string} fileUrl - The GitHub file URL.
 * @returns {Promise<string>} - The fetched code as text.
 * @throws Will throw an error if the file cannot be fetched or exceeds size limits.
 */
async function fetchCodeFromGitHubFile(fileUrl) {
  const rawUrl = fileUrl
    .replace('github.com', 'raw.githubusercontent.com')
    .replace('/blob/', '/');

  const headers = {};
  if (github_access_token) {
    headers['Authorization'] = `token ${github_access_token}`;
  }

  try {
    const response = await fetch(rawUrl, { headers });
    if (!response.ok) {
      throw new Error(`GitHub raw content error: ${response.statusText}`);
    }

    const code = await response.text();

    // Check file size (assuming UTF-8 encoding)
    const fileSizeInBytes = Buffer.byteLength(code, 'utf8');
    const maxFileSize = 50 * 1024; // 50KB
    if (fileSizeInBytes > maxFileSize) {
      throw new Error('File size exceeds 50KB limit.');
    }

    return code;
  } catch (error) {
    throw error;
  }
}
