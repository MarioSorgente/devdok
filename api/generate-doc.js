const fetch = require('node-fetch');

const openai_api_key = process.env.OPENAI_API_KEY;

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.status(405).send({ message: 'Only POST requests allowed' });
    return;
  }

  const { code, jira } = req.body;

  const prompt = `
You are an AI assistant that helps developers create clear and concise documentation for their code. Based on the provided code snippet and associated Jira ticket information, generate comprehensive documentation in **Markdown format compatible with Notion**.

**Instructions:**
* **Understand the Context:**
  * Carefully read the code snippet to grasp its functionality.
  * Review the Jira ticket details for additional context and requirements.
* **Generate Documentation Including:**
  * **Title**: A clear and descriptive title for the code component.
  * **Summary**: A brief overview of what the code does and its purpose within the project.
  * **Detailed Explanation:**
    * Explain key functions, classes, and methods.
    * Describe interactions between different parts of the code.
    * Highlight important algorithms or logic.
    * Suggest Unit tests.
  * **Usage Instructions:**
    * Provide examples of how to use the code.
    * Include any prerequisites or dependencies.
  * **Notes and Recommendations:**
    * Mention limitations, assumptions, or important considerations.
    * Suggest potential improvements or alternatives if applicable.
* **Formatting Guidelines:**
  * Use Markdown syntax compatible with **Notion**:
    * **Headings**: Use # for headings (e.g., #, ##, ###).
    * **Code Blocks**: Enclose code snippets within triple backticks (\`\`\`) and specify the language (e.g., \`\`\`python).
    * **Lists**: Use hyphens (-) for bullet points and numbers followed by periods (1.) for numbered lists.
    * **Bold and Italics**: Use double asterisks (**) for bold and single asterisks (*) or underscores (_) for italics.
    * **Inline Code**: Use single backticks (\`) for inline code.
  * **Avoid**:
    * Advanced Markdown features that may not render properly in Notion (e.g., HTML tags, footnotes).
    * Unnecessary whitespace or special characters.
* **Ensure** that the output is clean and well-structured for easy reading in Notion.

**Code Snippet:**
\`\`\`
${code}
\`\`\`

**Jira Ticket Details:**
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
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for generating code documentation.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
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
