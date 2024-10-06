const form = document.getElementById('bug-report-form');
const token = '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'; // replace with your new token
const projectNumber = 2; // replace with your project number
const repoOwner = 'MicaLovesKPOP'; // replace with your GitHub username
const repoName = 'crashdayhub'; // replace with your repository name

const debug = console.debug;
const info = console.info;
const warn = console.warn;
const error = console.error;

const logRequest = (method, url, headers, body) => {
  debug(`Request: ${method} ${url}`);
  debug(`Headers: ${JSON.stringify(headers)}`);
  debug(`Body: ${JSON.stringify(body)}`);
};

const logResponse = (response) => {
  debug(`Response: ${response.status} ${response.statusText}`);
  debug(`Headers: ${JSON.stringify(response.headers)}`);
  debug(`Body: ${response.body}`);
};

const logError = (error) => {
  if (typeof error === 'object' && error!== null) {
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
  } else {
    console.error(`Error: ${error}`);
  }
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const formData = new FormData(form);
    const title = formData.get('title');
    const description = formData.get('description');
    const reproductionSteps = formData.get('reproduction-steps');
    const expectedBehavior = formData.get('expected-behavior');
    const actualBehavior = formData.get('actual-behavior');
    const systemInfo = formData.get('system-info');

    info('Form data:', {
      title,
      description,
      reproductionSteps,
      expectedBehavior,
      actualBehavior,
      systemInfo
    });

    const apiEndpoint = `https://api.github.com/repos/${repoOwner}/${repoName}/issues`;
    info('API endpoint:', apiEndpoint);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    info('Headers:', headers);

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
        id: projectNumber
      }
    };
    info('Issue body:', issueBody);

    try {
      logRequest('POST', apiEndpoint, headers, issueBody);
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(issueBody)
      });
      logResponse(response);

      if (response.ok) {
        info('Issue created successfully!');
        alert('Bug report submitted successfully!');
        form.reset();
      } else {
        warn(`Error creating issue: ${response.statusText}`);
        logError(new Error(`Error creating issue: ${response.statusText}`));
        alert(`Error submitting bug report: ${response.statusText}`);
        console.error('Response text:', await response.text());
      }
    } catch (error) {
      logError(error);
      alert(`Error submitting bug report: ${error.message}`);
    }
  } catch (error) {
    logError(error);
    alert(`Error submitting bug report: ${error.message}`);
  }
});
