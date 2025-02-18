# Notify Teams Workflows Webhook

[![GitHub Super-Linter](https://github.com/actions/javascript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/javascript-action/actions/workflows/ci.yml/badge.svg)
![Coverage](./badges/coverage.svg)

[日本語](./README.md)

This action sends a POST request to the specified Webhook URL.
By default, it sends JSON data containing the following elements:
* body
  * Workflow number
  * Last commit message
  * Repository name
  * Branch name
  * Workflow name
  * Changed files in the last commit
* actions
  * Button to navigate to the GitHub workflow screen

You can also customize the default display content or send content based on a user-created template file.

## What's new

T.B.D

## Usage

### Workflows

```yaml
- uses: actions/checkout@v4
  with:
    # Ensure fetch-depth is set to 0 or greater than 1 to display changed files
    fetch-depth: 2
- uses: PanasonicConnect/notify-teams-workflows-webhook
  with:
    # Specify the Workflows Webhook URL for the Teams notification channel
    webhook-url: ${{ secrets.TEST_WEBHOOK_URL }}
    # Specify the path to the template file (.json) if using a custom template
    # default: none
    # example: .github/config/notify-template.json
    template: ''
    # Specify the path to the configuration file (.json) if using custom settings
    # default: none
    # example: .github/config/notify-config.json
    config: ''
    # Specify the parameter for sending custom message 1
    # default: none
    message1: ''
    # Specify the parameter for sending custom message 2
    # default: none
    message2: ''
    # Specify the title of the action button to be added to the notification message
    # default: View Workflow
    # example: ['View Workflow', 'View Pages']
    action-titles: []
    # Specify the URL to navigate to when the action button is pressed
    # default: URL of the workflow execution history screen that executed this action
    # example: ['https://github-workflow-url', 'https://github-pages-url']
    action-urls: []
```

### Permission

```yaml
permissions:
  contents: read
```

### Template

You can define the data sent as the body in the adaptive card format sent to the Teams workflows webhook URL as a template.

```json
{
  "attachments": [
    {
      "contentType": "application/vnd.microsoft.card.adaptive",
      "content": {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.2",
        "body": [], // Automatically generated based on the template parameter or default template content
        "actions": [] // Automatically generated based on the action-titles and action-urls parameters
      }
    }
  ]
}
```

If the template parameter is not specified, the following template will be used.
The parts enclosed in `{` and `}` in the template are treated as variables and will be replaced with the values at the time of workflow execution.

#### Default template

```json
[
  {
    "type": "TextBlock",
    "text": "{GITHUB_RUN_NUMBER} {COMMIT_MESSAGE}",
    "id": "Title",
    "spacing": "Medium",
    "size": "large",
    "weight": "Bolder",
    "color": "Accent"
  },
  {
    "type": "TextBlock",
    "text": "{CUSTOM_MESSAGE_1}",
    "separator": true,
    "wrap": true
  },
  {
    "type": "FactSet",
    "facts": [
      {
        "title": "Repository:",
        "value": "{GITHUB_REPOSITORY}"
      },
      {
        "title": "Branch:",
        "value": "{BRANCH}"
      },
      {
        "title": "Workflow:",
        "value": "{GITHUB_WORKFLOW}"
      },
      {
        "title": "Event:",
        "value": "{GITHUB_EVENT_NAME}"
      },
      {
        "title": "Actor:",
        "value": "{GITHUB_ACTOR}"
      },
      {
        "title": "SHA-1:",
        "value": "{GITHUB_SHA}"
      }
    ],
    "separator": true,
    "id": "acFactSet"
  },
  {
    "type": "TextBlock",
    "text": "{CUSTOM_MESSAGE_2}",
    "separator": true,
    "wrap": true
  },
  {
    "type": "TextBlock",
    "text": "**Changed files:**",
    "separator": true,
    "wrap": true
  },
  {
    "type": "TextBlock",
    "text": "{CHANGED_FILES}",
    "size": "small",
    "wrap": false
  }
]
```

#### Variables

The following variables can be used in the template file.

|Variable Name|Description|
|---|---|
|{CUSTOM_MESSAGE_1}|Custom message 1|
|{CUSTOM_MESSAGE_2}|Custom message 2|
|{GITHUB_RUN_NUMBER}|Workflow run number|
|{COMMIT_MESSAGE}|First line of the last commit message|
|{GITHUB_SHA}|SHA-1 value of the last commit|
|{CHANGED_FILES}|Changed files in the last commit|
|{GITHUB_REPOSITORY}|Repository name|
|{BRANCH}|Branch name|
|{GITHUB_WORKFLOW}|Workflow name|
|{GITHUB_EVENT_NAME}|Event name that triggered the workflow|
|{GITHUB_ACTOR}|Username of the user who triggered the workflow|

### Configuration

By specifying the config parameter, you can customize the content and conditions of the notification.

```json
{
  // Specify whether to display each item of the Default Template
  "visible": {
    // Specify whether to display the block containing {GITHUB_REPOSITORY}
    // default: true
    "repository_name": true,
    // Specify whether to display the block containing {BRANCH}
    // default: true
    "branch_name": true,
    // Specify whether to display the block containing {GITHUB_WORKFLOW}
    // default: true
    "workflow_name": true,
    // Specify whether to display the block containing {GITHUB_EVENT_NAME}
    // default: false
    "event": false,
    // Specify whether to display the block containing {GITHUB_ACTOR}
    // default: false
    "actor": false,
    // Specify whether to display the block containing {GITHUB_SHA}
    // default: false
    "sha1": false,
    // Specify whether to display the block containing {CHANGED_FILES}
    // default: true
    "changed_files": true
  },
  "notification": {
    // Specify whether to ignore notifications if certain keywords are included in the commit message
    // default: false
    // example: ["ignore:", "typo:"]
    "ignoreKeywords": []
  },
  "changedFile": {
    // Specify the maximum number of changed files to display
    // default: 10
    "max": 10
  }
}
```

## For developers

## Initial Setup

Clone the repository and install the dependencies.

!!! note
    Use Node.js version 20.x or higher.

1. Install the packages

   ```bash
   npm install
   ```

## Update the Action Code

1. Modify the code under [`src/`](./src/).
   For more details on the GitHub Actions toolkit, see the [documentation](https://github.com/actions/toolkit/blob/main/README.md).
2. Add tests under [`__tests__/`](./__tests__).
3. Run the tests and ensure they pass with `npm run test`.
4. Package the JavaScript and ensure the tests and build succeed with `npm run all`.

## License

The scripts and documentation in this project are released under the [MIT License](./LICENSE).
