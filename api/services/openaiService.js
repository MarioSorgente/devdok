// services/openaiService.js

const fetch = require('node-fetch');

const openai_api_key = process.env.OPENAI_API_KEY;

exports.generateDocumentation = async function (code, jira) {
  // Build the prompt
  const prompt = `
You are a developer reviewing the following code snippet or file. Based on the code and any provided context, generate documentation in **Markdown format compatible with Notion**.

**Instructions:**
- **Title:** Provide a clear and descriptive title.
- **Summary:** Write a brief overview of what the code does.
- **Key Components:**
  - Explain main functions, classes, or methods and everything a developer at Google would document, without making unsupported assumptions.
- **Formatting:**
  - Use clear headings and bullet points.
  - Include code snippets if they aid understanding.
- **Note:** 
  - If the code lacks comments or is part of a larger project, please highlight the parts that need additional context or explanations to improve the accuracy of the documentation.

**Code Snippet:**
\`\`\`
${code}
\`\`\`

**Context Details:**
${jira}

Provide the documentation below:
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openai_api_key}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo-16k',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for generating code documentation.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const documentation = data.choices[0].message.content.trim();
      return documentation;
    } else {
      console.error('OpenAI API error:', data);
      throw new Error('Error from OpenAI API');
    }
  } catch (error) {
    console.error('Error generating documentation:', error);
    throw error;
  }
};
