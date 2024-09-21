const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { name, title, body } = req.body;

    const issueResponse = await fetch('https://api.github.com/repos/YOUR_USERNAME/YOUR_REPOSITORY/issues', {
        method: 'POST',
        headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            title: title,
            body: `**Submitted by:** ${name}\n\n${body}`
        })
    });

    if (issueResponse.ok) {
        const issue = await issueResponse.json();
        const issueId = issue.id;

        const projectResponse = await fetch(`https://api.github.com/projects/columns/YOUR_COLUMN_ID/cards`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                content_id: issueId,
                content_type: 'Issue'
            })
        });

        if (projectResponse.ok) {
            res.status(200).json({ message: 'Issue submitted successfully and added to the project!' });
        } else {
            res.status(500).json({ message: 'Failed to add issue to the project.' });
        }
    } else {
        res.status(500).json({ message: 'Failed to submit issue.' });
    }
};
