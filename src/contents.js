import { context } from '@actions/github'

const DEFAULT_MAX_CHANGED_FILES = 10

const titleBlock = {
  type: 'TextBlock',
  text: '#{GITHUB_RUN_NUMBER} {COMMIT_MESSAGE}',
  id: 'Title',
  spacing: 'Medium',
  size: 'large',
  weight: 'Bolder',
  color: 'Accent'
}

const singleTextBlockCustom1 = {
  type: 'TextBlock',
  text: '{CUSTOM_MESSAGE_1}',
  separator: true,
  wrap: true
}

const singleTextBlockCustom2 = {
  type: 'TextBlock',
  text: '{CUSTOM_MESSAGE_2}',
  separator: true,
  wrap: true
}

const factBlock = {
  type: 'FactSet',
  facts: [],
  separator: true,
  id: 'acFactSet'
}

const factBlockRepository = {
  title: 'Repository:',
  value: '{GITHUB_REPOSITORY}'
}
const factBlockBranch = {
  title: 'Branch:',
  value: '{BRANCH}'
}
const factBlockWorkflow = {
  title: 'Workflow:',
  value: '{GITHUB_WORKFLOW}'
}
const factBlockEvent = {
  title: 'Event:',
  value: '{GITHUB_EVENT_NAME}'
}
const factBlockActor = {
  title: 'Actor:',
  value: '{GITHUB_ACTOR}'
}
const factBlockSha1 = {
  title: 'SHA-1:',
  value: '{GITHUB_SHA}'
}
const singleTextBlockChangedFileTitle = {
  type: 'TextBlock',
  text: '**Changed files:**',
  separator: true,
  wrap: true
}
const singleTextBlockChangedFiles = {
  type: 'TextBlock',
  text: '{CHANGED_FILES}',
  size: 'small',
  wrap: false
}

/**
 * Retrieves the status from the job context.
 *
 * @returns {string} The status of the job.
 */
const getStatus = () => {
  return JSON.parse(context.job).status
}

/**
 * Constructs the URL for the current GitHub Actions workflow run.
 *
 * @returns {string} The URL of the current workflow run.
 */
const getWorkflowUrl = () => {
  return `${context.payload.repository?.html_url}/actions/runs/${context.runId}`
}

/**
 * Retrieves the branch name from the context, stripping the "refs/heads/" prefix.
 *
 * @returns {string} The name of the branch.
 */
const getBranch = () => {
  // context.ref の "refs/heads/" プレフィックスを除去する
  return context.ref ? context.ref.replace('refs/heads/', '') : ''
}

/**
 * Creates an array of actions based on the provided action parameters.
 *
 * @param {Array} actionParams - The parameters for the actions to be created.
 * @returns {Array} The array of action objects.
 */
export const makeAction = (titles, urls) => {
  const actions = []
  if (titles.length != urls.length) {
    throw new Error(`Action titles and URLs must have the same length. Titles: ${titles.length}, URLs: ${urls.length}`)
  }

  // If no action parameters are provided, return the default action to view the workflow.
  if ((titles.length == 0 && urls.length == 0) || (titles.length == 1 && urls.length == 1 && !titles[0] && !urls[0])) {
    actions.push({
      type: 'Action.OpenUrl',
      title: 'View Workflow',
      url: getWorkflowUrl()
    })
    return actions
  }
  // Create an action for each parameter provided.
  for (let i = 0; i < titles.length; i++) {
    if (!titles[i] || !urls[i]) {
      throw new Error('Action parameters must contain a title and URL.')
    }
    actions.push({
      type: 'Action.OpenUrl',
      title: titles[i],
      url: urls[i]
    })
  }
  return actions
}
/**
 * Creates a default body for a message with optional custom messages and commit details.
 *
 * @param {config} config - The configuration for creating the card.
 * @param {string} customMessage1 - The first custom message to include in the body.
 * @param {string} customMessage2 - The second custom message to include in the body.
 * @param {Object} commitInfo - Information about the commit.
 * @returns {Object} The constructed body object with the provided parameters.
 */
export const makeDefaultBody = (config, customMessage1, customMessage2, commitInfo) => {
  const body = []
  body.push(titleBlock)
  if (customMessage1) {
    body.push(singleTextBlockCustom1)
  }
  // create fact set
  const fact = JSON.parse(JSON.stringify(factBlock))
  if (config?.visible?.repository_name) {
    fact.facts.push(factBlockRepository)
  }
  if (config?.visible?.branch_name) {
    fact.facts.push(factBlockBranch)
  }
  if (config?.visible?.workflow_name) {
    fact.facts.push(factBlockWorkflow)
  }
  if (config?.visible?.event) {
    fact.facts.push(factBlockEvent)
  }
  if (config?.visible?.actor) {
    fact.facts.push(factBlockActor)
  }
  if (config?.visible?.sha1) {
    fact.facts.push(factBlockSha1)
  }

  if (fact.facts.length > 0) {
    body.push(fact)
  }
  if (customMessage2) {
    body.push(singleTextBlockCustom2)
  }
  if (config?.visible?.changed_files && commitInfo.changedFiles) {
    body.push(singleTextBlockChangedFileTitle)
    body.push(singleTextBlockChangedFiles)
  }
  const replacedBody = replaceBodyParameters(config, JSON.stringify(body), customMessage1, customMessage2, commitInfo)
  const parsedBody = JSON.parse(replacedBody)
  return parsedBody
}

/**
 * Generates a string representation of the changed files.
 *
 * @param {Object} config - The configuration object.
 * @param {Object} config.changedFile - Configuration for changed files.
 * @param {number} config.changedFile.max - The maximum number of files to display.
 * @param {string[]} changedFiles - An array of changed file paths.
 * @returns {string} A formatted string of changed files, limited by the max number specified in the config.
 */
export const generateChangedFilesString = (config, changedFiles) => {
  if (!Array.isArray(changedFiles)) {
    return ''
  }
  const maxFiles = config?.changedFile?.max || DEFAULT_MAX_CHANGED_FILES
  const displayedFiles = changedFiles.slice(0, maxFiles).map((file) => `\`${file}\``)
  if (changedFiles.length > maxFiles) {
    displayedFiles.push('...')
  }
  return displayedFiles.join('\\n\\n')
}

/**
 * Replaces placeholders in the target string with corresponding values from the provided parameters.
 *
 * @param {Object} config - Configuration object.
 * @param {string} target - The target string containing placeholders to be replaced.
 * @param {string} customMessage1 - Custom message to replace the {CUSTOM_MESSAGE_1} placeholder.
 * @param {string} customMessage2 - Custom message to replace the {CUSTOM_MESSAGE_2} placeholder.
 * @param {Object} commitInfo - Information about the commit.
 * @param {string} commitInfo.commitMessage - The commit message to replace the {COMMIT_MESSAGE} placeholder.
 * @param {Array<string>} commitInfo.changedFiles - List of changed files to generate the {CHANGED_FILES} placeholder.
 * @returns {string} The target string with all placeholders replaced by their corresponding values.
 */
export const replaceBodyParameters = (config, target, customMessage1, customMessage2, commitInfo) => {
  const changedFilesString = generateChangedFilesString(config, commitInfo.changedFiles)

  return target
    .replace('{GITHUB_RUN_NUMBER}', context.runNumber)
    .replace('{COMMIT_MESSAGE}', commitInfo.commitMessage)
    .replace('{CUSTOM_MESSAGE_1}', customMessage1)
    .replace('{GITHUB_REPOSITORY}', context.payload.repository?.name)
    .replace('{BRANCH}', getBranch())
    .replace('{GITHUB_EVENT_NAME}', context.eventName)
    .replace('{GITHUB_WORKFLOW}', context.workflow)
    .replace('{GITHUB_ACTOR}', context.actor)
    .replace('{GITHUB_SHA}', context.sha)
    .replace('{CHANGED_FILES}', changedFilesString)
    .replace('{CUSTOM_MESSAGE_2}', customMessage2)
}
