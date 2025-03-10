import * as core from '@actions/core'
import { context } from '@actions/github'
import * as exec from '@actions/exec'
import fs from 'fs'
import { makeCodeDefaultBody, makeAction, replaceBodyParameters } from './contents'

const DEFAULT_CONFIG = {
  visible: {
    repository_name: true,
    branch_name: true,
    workflow_name: true,
    event: false,
    actor: false,
    sha1: false,
    changed_files: true
  }
}

/**
 * Retrieves and processes input values required for the custom action.
 *
 * @returns {Object} An object containing:
 *   - webhookUrl {string}: The URL of the webhook for notifications.
 *   - template {string}: The template string for formatting messages.
 *   - customMessage1 {string}: The first custom message.
 *   - customMessage2 {string}: The second custom message.
 *   - actionTitles {string[]}: An array of action titles, derived by splitting the input on newlines.
 *   - actionUrls {string[]}: An array of action URLs, derived by splitting the input on newlines.
 */
const getInputs = () => {
  return {
    webhookUrl: core.getInput('webhook-url'),
    template: core.getInput('template'),
    config: core.getInput('config'),
    customMessage1: core.getInput('message1'),
    customMessage2: core.getInput('message2'),
    actionTitles: core.getInput('action-titles')?.split('\n') || [],
    actionUrls: core.getInput('action-urls')?.split('\n') || []
  }
}

/**
 * Retrieves the SHA of the current commit or pull request.
 *
 * @returns {string} The SHA of the current commit or pull request.
 */
const getSha = () => {
  return context.eventName == 'pull_request' ? context.payload.pull_request?.head?.sha : context.sha
}
/**
 * Retrieves the commit message for a specific commit SHA.
 *
 * @param {string} sha - The SHA hash of the commit to check.
 * @param {Object} execOptions - The options to pass to the exec command.
 * @returns {Promise<string>} - A promise that resolves to the commit message.
 */
const getCommitMessage = async (sha, execOptions) => {
  const { stdout } = await exec.getExecOutput('git', ['show', '-s', '--format=%B', sha], execOptions)
  return stdout.split('\n')[0].trim() // Get the first line of the commit message
}

/**
 * Retrieves the list of files changed in a specific commit.
 *
 * @param {string} sha - The SHA hash of the commit to check.
 * @param {object} execOptions - Options to pass to the exec command.
 * @returns {Promise<string[]>} A promise that resolves to an array of changed file paths.
 */
const getChangedFiles = async (sha, execOptions) => {
  const { stdout: changedFilesStdout } = await exec.getExecOutput('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', `${sha}^1`, sha], execOptions)
  return changedFilesStdout.trim().split('\n')
}

/**
 * Retrieves the author of the most recent commit.
 *
 * @param {object} execOptions - The options to pass to the exec command.
 * @returns {Promise<string>} - A promise that resolves to the author of the most recent commit.
 */
const getCommitAuthor = async (execOptions) => {
  const { stdout: author } = await exec.getExecOutput('git', ['log', '-1', '--pretty=format:%an'], execOptions)
  return author.replace(/\\/g, '').trim()
}
/**
 * Generates the body object for the custom action.
 *
 * If a template path is provided in inputs.template, attempts to read and process the template
 * by replacing placeholders with the provided custom messages, commit message, and changed files,
 * and then parses the result as JSON. If no template is provided, returns a default body object.
 *
 * @param {Object} inputs - An object containing input values.
 * @param {string} [inputs.template] - Optional path to the template file.
 * @param {string} inputs.customMessage1 - The first custom message.
 * @param {string} inputs.customMessage2 - The second custom message.
 * @param {config} config - The configuration for creating the card.
 * @param {Object} commitInfo - The commit information.
 * @param {string} commitInfo.commitMessage - The commit message.
 * @param {Array} commitInfo.changedFiles - The list of changed files.
 * @returns {Object} The body object generated from the template or default values.
 * @throws {Error} Throws an error if the template file specified by inputs.template cannot be loaded or parsed.
 */
const getBody = (inputs, config, commitInfo) => {
  if (inputs.template) {
    try {
      const templatesContent = fs.readFileSync(inputs.template, { encoding: 'utf8' })
      const processedContent = replaceBodyParameters(config, templatesContent, inputs.customMessage1, inputs.customMessage2, commitInfo)
      const processedObject = JSON.parse(processedContent)
      core.group('Template body', () => core.info(JSON.stringify(processedObject, null, 2)))
      return processedObject
    } catch (err) {
      throw new Error(`Failed to load template from ${inputs.template}: ${err.message}`)
    }
  } else {
    const defaultBody =
      context.eventName == 'issues'
        ? makeIssueDefaultBody(config, inputs.customMessage1, inputs.customMessage2)
        : makeCodeDefaultBody(config, inputs.customMessage1, inputs.customMessage2, commitInfo)
    core.group('Default body', () => core.info(JSON.stringify(defaultBody, null, 2)))
    return defaultBody
  }
}
/**
 * Creates an adaptive card payload for Microsoft Teams.
 *
 * @param {Object} inputs - The input parameters for the card.
 * @param {Array} inputs.actionTitles - The titles of the actions.
 * @param {Array} inputs.actionUrls - The URLs of the actions.
 * @param {Object} config - The configuration object.
 * @param {Object} commitInfo - The commit information.
 * @param {string} commitInfo.commitMessage - The commit message.
 * @param {Array} commitInfo.changedFiles - The list of changed files.
 * @returns {Object} The adaptive card payload.
 */
const createAdapterCardPayload = (inputs, config, commitInfo) => {
  const bodyContent = getBody(inputs, config, commitInfo)
  const actionsContent = makeAction(inputs.actionTitles, inputs.actionUrls)

  return {
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.2',
          body: bodyContent,
          actions: actionsContent
        }
      }
    ]
  }
}
/**
 * Sends a POST request to the specified webhook URL with the provided payload.
 *
 * @param {string} webhookUrl - The URL of the webhook to which the POST request is sent.
 * @param {any} payload - The payload to be sent in the POST request body. It should be a JSON string or an object that can be stringified.
 * @returns {Promise<void>} A promise that resolves when the POST request completes successfully, or rejects with an error if the request fails.
 * @throws {Error} Throws an error if the response from the server is not ok.
 */
const postWebhookUrl = async (webhookUrl, payload) => {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.statusText}`)
  }
}

/**
 * Determines whether a notification should be skipped based on the commit message and specified ignore keywords.
 *
 * @param {string} commitMessage - The commit message to check against the ignore keywords.
 * @param {Object} notification - The notification object containing the ignore keywords.
 * @param {string[]} [notification.ignoreKeywords] - An array of keywords to check for in the commit message.
 * @returns {boolean} - Returns true if the commit message contains any of the ignore keywords, otherwise false.
 */
const isSkipNotification = (commitMessage, notification) => {
  // Notify if not specified.
  const ignoreKeywords = notification?.ignoreKeywords
  if (!ignoreKeywords) {
    return false
  }
  if (!Array.isArray(ignoreKeywords)) {
    return false
  }
  return ignoreKeywords.some((keyword) => commitMessage?.includes(keyword))
}

/**
 * Generates an object containing information about the latest commit.
 *
 * @param {Object} execOptions - Options to be used for executing commands.
 * @returns {Promise<Object>} An object containing the SHA, commit message, list of changed files, and author of the latest commit.
 * @property {string} sha - The SHA of the latest commit.
 * @property {string} commitMessage - The message of the latest commit.
 * @property {Array<string>} changedFiles - The list of files changed in the latest commit.
 * @property {string} author - The author of the latest commit.
 */
const makeCommitInfo = async (execOptions) => {
  const sha = getSha()

  // Get the latest commit message
  const commitMessage = await getCommitMessage(sha, execOptions)

  // Get the list of changed files from the latest commit
  const changedFiles = await getChangedFiles(sha, execOptions)

  // Get the latest author of the commit
  const author = await getCommitAuthor(execOptions)

  return {
    sha,
    commitMessage,
    changedFiles,
    author
  }
}

export async function run() {
  try {
    // get inputs
    const inputs = getInputs()

    // Read the contents of the config file
    const config = inputs.config ? JSON.parse(fs.readFileSync(inputs.config, { encoding: 'utf8' })) : DEFAULT_CONFIG

    // Retrieve basic information from GitHub Actions context
    const execOptions = {
      ignoreReturnCode: true
      //silent: !core.isDebug()
    }

    // make commit information
    const commitInfo = context.eventName == 'issues' ? {} : await makeCommitInfo(execOptions)
    // @note: Insert line breaks.The next core.group will be concatenated with the standard output.
    core.info('')

    core.group('Inputs', () => {
      core.info(`inputs: ${JSON.stringify(inputs, null, 2)}`)
      core.info(`config: ${JSON.stringify(config, null, 2)}`)
      core.info(`commitInfo: ${JSON.stringify(commitInfo, null, 2)}`)
      core.info(`context: ${JSON.stringify(context, null, 2)}`)
    })

    // Skip notification if the commit message contains any of the ignore keywords
    if (isSkipNotification(commitInfo.commitMessage, config.notification)) {
      core.info('Skipping notification.')
      return
    }

    // Create the body and actions of the Adaptive Card
    const payload = createAdapterCardPayload(inputs, config, commitInfo)
    core.group('Payload', () => core.info(JSON.stringify(payload, null, 2)))

    // Send Adaptive Card to webhook-url via POST request
    await postWebhookUrl(inputs.webhookUrl, payload)

    core.group('Result', () => core.info('Message sent successfully.'))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
