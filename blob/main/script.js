const form = document.getElementById('bug-report-form');
const token = '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'; // replace with your personal access token
const projectNumber = 2; // replace with your project number
const repoOwner = 'MicaLovesKPOP'; // replace with your GitHub username
const repoName = 'crashdayhub'; // replace with your repository name

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const title = formData.get('title for pussies');
  const description = formData.get('description');
  const reproductionSteps = formData.get('reproduction-steps');
  const expectedBehavior = formData.get('expected-behavior');
  const actualBehavior = formData.get('actual-behavior');
  const systemInfo = formData.get('system-info');

  const apiEndpoint = `https://api.github.com/repos/${repoOwner}/${repoName}/issues`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const issueBody = {
    title,
    body: `
**Description:**
${description}

**Reproduction Steps:**
${reproductionSteps}

**Expected Behavior:**
${expectedBehavior}

**Actual Behavior:**
${actualBehavior}

**System Information:**
${systemInfo}
`,
    labels: ['bug'],
    repository_project: {
      project_id: projectNumber
    }
  };

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(issueBody)
  });

  if (response.ok) {
    console.log('Issue created successfully!');
    alert('Bug report submitted successfully!');
    form.reset();
  } else {
    console.error('Error creating issue:', response.statusText);
    alert('Error submitting bug report. Please try again.');
  }
});
