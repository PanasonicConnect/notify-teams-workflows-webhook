import * as core from '@actions/core'
import { context } from '@actions/github'
import * as exec from '@actions/exec'
import fs from 'fs'
import { makeDefaultBody, makeAction, replaceBodyParameters } from './contents'

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
    customMessage1: core.getInput('message1'),
    customMessage2: core.getInput('message2'),
    actionTitles: core.getInput('action-titles')?.split('\n') || [],
    actionUrls: core.getInput('action-urls')?.split('\n') || [],
    visibleChangedFiles: core.getInput('visible-changed-files')
  }
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
 * @param {string} commitMessage - The commit message used in the body.
 * @param {string[]} changedFiles - Array of file names that were changed.
 * @returns {Object} The body object generated from the template or default values.
 * @throws {Error} Throws an error if the template file specified by inputs.template cannot be loaded or parsed.
 */
const getBody = (inputs, commitMessage, changedFiles) => {
  if (inputs.template) {
    try {
      const templatesContent = fs.readFileSync(inputs.template, { encoding: 'utf8' })
      const processedContent = replaceBodyParameters(templatesContent, inputs.customMessage1, inputs.customMessage2, commitMessage, changedFiles)
      core.group('Template body', () => core.info(JSON.stringify(processedContent, null, 2)))
      return JSON.parse(processedContent)
    } catch (err) {
      throw new Error(`Failed to load template from ${inputs.template}: ${err.message}`)
    }
  } else {
    const useChangedFiles = inputs.visibleChangedFiles == 'true' ? changedFiles : undefined
    const defaultBody = makeDefaultBody(inputs.customMessage1, inputs.customMessage2, commitMessage, useChangedFiles)
    core.group('Default body', () => core.info(JSON.stringify(defaultBody, null, 2)))
    return defaultBody
  }
}
/**
 * Creates the payload for an Adaptive Card containing commit and file change details.
 *
 * @param {Object} inputs - The input parameters for creating the card.
 * @param {string[]} inputs.actionTitles - An array of titles for the action buttons.
 * @param {string[]} inputs.actionUrls - An array of URLs corresponding to each action.
 * @param {string} commitMessage - The commit message to display in the card body.
 * @param {Array} changedFiles - A list of changed files to be included in the card body.
 * @returns {Object} An object representing the Adaptive Card payload with attachments.
 */
const createAdapterCardPayload = (inputs, commitMessage, changedFiles) => {
  const bodyContent = getBody(inputs, commitMessage, changedFiles)
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
    body: payload
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.statusText}`)
  }
}
export async function run() {
  try {
    // get inputs
    const inputs = getInputs()

    // Retrieve basic information from GitHub Actions environment variables
    const sha = context.sha
    const execOptions = {
      ignoreReturnCode: true
      //silent: !core.isDebug()
    }
    // Get the latest commit message
    const { stdout } = await exec.getExecOutput('git', ['show', '-s', '--format=%B', sha], execOptions)
    const commitMessage = stdout.trim()

    // Get the list of changed files from the latest commit
    const { stdout: changedFilesStdout } = await exec.getExecOutput('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', sha], execOptions)
    const changedFiles = changedFilesStdout.trim().split('\n')

    core.group('Inputs', () => {
      core.info(`inputs: ${JSON.stringify(inputs, null, 2)}`)
      core.info(`commit message: ${commitMessage}`)
      core.info(`changed files: ${changedFiles}`)
      core.info(`context: ${JSON.stringify(context, null, 2)}`)
    })

    // Create the body and actions of the Adaptive Card
    const payload = createAdapterCardPayload(inputs, commitMessage, changedFiles)
    core.group('Payload', () => core.info(JSON.stringify(payload, null, 2)))

    // Send Adaptive Card to webhook-url via POST request
    await postWebhookUrl(inputs.webhookUrl, payload)

    core.group('Result', () => core.info('Message sent successfully.'))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
