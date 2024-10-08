// services/githubService.js

const fetch = require('node-fetch');

const github_access_token = process.env.GITHUB_ACCESS_TOKEN; // From environment variables

exports.fetchCodeFromGitHubFile = async function (fileUrl) {
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
      headers: headers,
    });

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
};
