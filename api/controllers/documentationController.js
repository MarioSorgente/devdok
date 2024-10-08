// controllers/documentationController.js

const openaiService = require('../services/openaiService');
const githubService = require('../services/githubService');

exports.generateDocumentation = async (req, res) => {
  try {
    let { code, jira, inputMethod, githubFileUrl } = req.body;

    // If inputMethod is 'githubFile', fetch code from GitHub
    if (inputMethod === 'githubFile') {
      try {
        code = await githubService.fetchCodeFromGitHubFile(githubFileUrl);
      } catch (error) {
        console.error('Error fetching code from GitHub:', error);
        return res.status(500).json({ error: 'Failed to fetch code from GitHub.' });
      }
    }

    // Check if code is provided
    if (!code) {
      return res.status(400).json({ error: 'No code provided for documentation.' });
    }

    // Check if the code exceeds token limits
    const maxCodeLength = 15000; // Adjust based on OpenAI API token limits
    if (code.length > maxCodeLength) {
      return res.status(400).json({ error: 'The selected code is too large to process. Please select a smaller file or code snippet.' });
    }

    // Generate documentation using OpenAI service
    const documentation = await openaiService.generateDocumentation(code, jira);

    return res.status(200).json({ documentation });
  } catch (error) {
    console.error('Error generating documentation:', error);
    return res.status(500).json({ error: 'Error generating documentation', details: error.message });
  }
};

