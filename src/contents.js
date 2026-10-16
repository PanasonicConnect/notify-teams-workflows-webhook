import { context } from '@actions/github'
import * as core from '@actions/core'
import path from 'node:path'

const DEFAULT_MAX_CHANGED_FILES = 10
const DEFAULT_MAX_ISSUE_BODY_LINES = 5

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

const issueTitleBlock = {
  type: 'TextBlock',
  text: '{ISSUE_TITLE}',
  id: 'Title',
  spacing: 'Medium',
  size: 'large',
  weight: 'Bolder',
  color: 'Accent'
}
const issueFactBlockLabels = {
  title: 'Labels:',
  value: '{ISSUE_LABELS}',
  size: 'small',
  wrap: false
}
const issueFactBlockMilestone = {
  title: 'MileStone:',
  value: '{ISSUE_MILESTONE}'
}
const issueTextBlockBody = {
  type: 'TextBlock',
  text: '{ISSUE_BODY}',
  size: 'small',
  separator: true,
  wrap: false
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
  if (context.eventName === 'pull_request') {
    return context.payload.pull_request?.head?.ref
  }
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
  if (titles.length !== urls.length) {
    throw new Error(`Action titles and URLs must have the same length. Titles: ${titles.length}, URLs: ${urls.length}`)
  }

  // If no action parameters are provided, return the default action to view the workflow.
  if ((titles.length === 0 && urls.length === 0) || (titles.length === 1 && urls.length === 1 && !titles[0] && !urls[0])) {
    if (context.eventName === 'issues') {
      actions.push({
        type: 'Action.OpenUrl',
        title: 'View Issue',
        url: context?.payload?.issue?.html_url
      })
      return actions
    } else {
      actions.push({
        type: 'Action.OpenUrl',
        title: 'View Workflow',
        url: getWorkflowUrl()
      })
      return actions
    }
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
 * Generates an array of entity objects for mentioning users in a message.
 *
 * @param {Array<Object>} users - An array of user objects.
 * @param {string} users[].alias - The alias of the user to be displayed in the mention.
 * @param {string} users[].displayName - The display name of the user.
 * @param {string} users[].id - The unique identifier of the user.
 * @returns {Array<Object>} An array of entity objects, each containing mention details.
 */
export const makeEntities = (users) => {
  return users.map((user) => {
    return {
      type: 'mention',
      text: `<at>${user.alias}</at>`,
      mentioned: {
        id: user.id,
        name: user.displayName
      }
    }
  })
}

/**
 * Creates a default body for a message with optional custom messages and commit details.
 *
 * @param {config} config - The configuration for creating the card.
 * @param {string} customMessage1 - The first custom message to include in the body.
 * @param {string} customMessage2 - The second custom message to include in the body.
 * @param {Object} commitInfo - Information about the commit.
 * @returns {Object|undefined} The constructed body object with the provided parameters, or undefined if filtering removes all changed files.
 */
export const makeCodeDefaultBody = (config, customMessage1, customMessage2, commitInfo) => {
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
  if (replacedBody === undefined) {
    return undefined
  }
  const parsedBody = JSON.parse(replacedBody)
  return parsedBody
}

/**
 * Generates the default body for an issue notification.
 *
 * @param {Object} config - Configuration object for visibility settings.
 * @param {boolean} config.visible.repository_name - Whether to include the repository name.
 * @param {boolean} config.visible.branch_name - Whether to include the branch name.
 * @param {boolean} config.visible.workflow_name - Whether to include the workflow name.
 * @param {boolean} config.visible.event - Whether to include the event.
 * @param {boolean} config.visible.actor - Whether to include the actor.
 * @param {boolean} config.visible.sha1 - Whether to include the SHA1.
 * @param {boolean} config.visible.changed_files - Whether to include changed files.
 * @param {string} customMessage1 - Custom message to be included in the body.
 * @param {string} customMessage2 - Another custom message to be included in the body.
 * @returns {Object} The parsed body of the issue notification.
 */
export const makeIssueDefaultBody = (config, customMessage1, customMessage2) => {
  const body = []
  body.push(issueTitleBlock)

  if (customMessage1) {
    body.push(singleTextBlockCustom1)
  }
  // create fact set
  const hasLabel = context.payload?.issue?.labels?.length > 0
  const hasMilestone = context.payload?.issue?.milestone?.title
  if (hasLabel || hasMilestone) {
    const fact = JSON.parse(JSON.stringify(factBlock)) // copy
    if (hasLabel) {
      fact.facts.push(issueFactBlockLabels)
    }
    if (hasMilestone) {
      fact.facts.push(issueFactBlockMilestone)
    }
    body.push(fact)
  }
  // body
  if (context.payload?.issue?.body) {
    body.push(issueTextBlockBody)
  }

  if (customMessage2) {
    body.push(singleTextBlockCustom2)
  }

  const replacedBody = replaceBodyParameters(config, JSON.stringify(body), customMessage1, customMessage2, undefined)
  const parsedBody = JSON.parse(replacedBody)
  return parsedBody
}

/**
 * Generates a string representation of the changed files.
 *
 * @param {Object} config - The configuration object.
 * @param {Object} config.changedFile - Configuration for changed files.
 * @param {number} config.changedFile.max - The maximum number of files to display.
 * @param {Object} config.filter - Configuration for filtering files.
 * @param {string[]} config.filter.extension - Array of file extensions to filter (e.g., ['.js', '.ts']).
 * @param {Object} config.mkdocs - Configuration for mkdocs link generation.
 * @param {string} config.mkdocs.baseUrl - Base URL for mkdocs site.
 * @param {string} config.mkdocs.rootDir - Root directory for mkdocs source files.
 * @param {string[]} changedFiles - An array of changed file paths.
 * @param {string} separator - Separator used to join entries in the inline code / link format. The code block format always uses a single line break in the same escaping style.
 * @returns {string|undefined} A formatted string of changed files, limited by the max number specified in the config. Returns undefined if no files match the filter or the input is not an array.
 */
export const generateChangedFilesString = (config, changedFiles, separator = '\\n\\n') => {
  if (!Array.isArray(changedFiles)) {
    return ''
  }

  // Filter files by extension if specified
  let filteredFiles = changedFiles
  const extensionFilter = config?.filter?.extension
  if (Array.isArray(extensionFilter) && extensionFilter.length > 0) {
    filteredFiles = changedFiles.filter((file) => {
      const fileExtension = getFileExtension(file)
      return extensionFilter.includes(fileExtension)
    })
    // If there are changed files but none match the filter, return undefined
    if (changedFiles.length > 0 && filteredFiles.length === 0) {
      return undefined
    }
  }

  const maxFiles = config?.changedFile?.max || DEFAULT_MAX_CHANGED_FILES
  const displayedFiles = filteredFiles.slice(0, maxFiles)
  if (filteredFiles.length > maxFiles) {
    displayedFiles.push('...')
  }

  const mkdocsLinkFor = (file) =>
    file !== '...' && config?.mkdocs?.baseUrl && shouldConvertToLink(file, config.mkdocs) ? generateMkdocsUrl(file, config.mkdocs) : undefined

  // If at least one displayed file has a mkdocs link, keep the inline code /
  // link format so the links remain clickable.
  if (displayedFiles.some((file) => mkdocsLinkFor(file))) {
    return displayedFiles
      .map((file) => {
        const linkUrl = mkdocsLinkFor(file)
        if (linkUrl) {
          return `[\`${file}\`](${linkUrl})`
        }
        return file === '...' ? file : `\`${file}\``
      })
      .join(separator)
  }

  if (displayedFiles.length === 0) {
    return ''
  }

  // Otherwise render the list as a fenced code block joined by single line
  // breaks, matching the escaping style of the separator.
  const lineBreak = separator.includes('\\') ? '\\n' : '\n'
  return ['```', ...displayedFiles, '```'].join(lineBreak)
}

/**
 * Extracts the file extension from a file path.
 *
 * @param {string} filePath - The file path.
 * @returns {string} The file extension including the dot (e.g., '.js', '.ts').
 */
const getFileExtension = (filePath) => {
  return path.extname(filePath)
}

/**
 * Determines if a file should be converted to a mkdocs link.
 *
 * @param {string} filePath - The file path.
 * @param {Object} mkdocsConfig - The mkdocs configuration.
 * @param {string} mkdocsConfig.rootDir - The root directory for mkdocs source files.
 * @returns {boolean} True if the file should be converted to a link.
 */
const shouldConvertToLink = (filePath, mkdocsConfig) => {
  // Check if file is a markdown file
  if (getFileExtension(filePath) !== '.md') {
    return false
  }

  // Check if file is within the mkdocs root directory
  const rootDir = mkdocsConfig.rootDir
  if (rootDir) {
    // Normalize path separators for cross-platform compatibility
    const normalizedFilePath = filePath.replace(/\\/g, '/')
    const normalizedRootDir = rootDir.replace(/\\/g, '/')

    if (!normalizedFilePath.startsWith(`${normalizedRootDir}/`) && normalizedFilePath !== normalizedRootDir) {
      return false
    }
  }

  return true
}

/**
 * Generates a mkdocs URL for a given file path.
 *
 * @param {string} filePath - The file path.
 * @param {Object} mkdocsConfig - The mkdocs configuration.
 * @param {string} mkdocsConfig.baseUrl - The base URL for the mkdocs site.
 * @param {string} mkdocsConfig.rootDir - The root directory for mkdocs source files.
 * @returns {string} The generated URL.
 */
const generateMkdocsUrl = (filePath, mkdocsConfig) => {
  const { baseUrl, rootDir } = mkdocsConfig

  // Normalize path separators for cross-platform compatibility
  const normalizedFilePath = filePath.replace(/\\/g, '/')
  const normalizedRootDir = rootDir ? rootDir.replace(/\\/g, '/') : ''

  // Remove the root directory prefix from the file path
  let relativePath = normalizedFilePath
  if (normalizedRootDir) {
    const rootDirWithSep = `${normalizedRootDir}/`
    if (normalizedFilePath.startsWith(rootDirWithSep)) {
      relativePath = normalizedFilePath.substring(rootDirWithSep.length)
    } else if (normalizedFilePath === normalizedRootDir) {
      relativePath = ''
    }
  }

  // Remove the .md extension
  if (relativePath.endsWith('.md')) {
    relativePath = relativePath.substring(0, relativePath.length - 3)
  }

  // Construct the URL
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return relativePath ? `${cleanBaseUrl}/${relativePath}` : cleanBaseUrl
}

/**
 * Creates a truncated issue body based on the provided configuration.
 *
 * @param {Object} config - Configuration object.
 * @param {Object} config.issueBodyLength - Configuration for issue body length.
 * @param {number} config.issueBodyLength.max - Maximum length of the issue body.
 * @param {string} body - The original issue body.
 * @returns {string} The truncated issue body with an ellipsis if it exceeds the maximum length.
 */
export const makeIssueBody = (config, body, separator = '\\n\\n') => {
  if (!body) return undefined

  const maxIssueBodyLines = config?.issue?.maxLines || DEFAULT_MAX_ISSUE_BODY_LINES // max lines

  // get lines (remove new line code)
  const bodyLines = body.split(/\r?\n/)

  // Get up to the maximum number of rows
  let displayBodyLines = bodyLines.slice(0, maxIssueBodyLines)

  // Remove leading and trailing spaces and heading markers
  // for Teams Bug? headlines are not correctly represented.
  displayBodyLines = displayBodyLines.map((line) => line.replace(/^#+\s+/, '').trim())

  // Add an ellipsis if the body exceeds the maximum number of lines
  if (bodyLines.length > maxIssueBodyLines) {
    displayBodyLines.push('...')
  }
  return displayBodyLines.join(separator)
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
 * @returns {string|undefined} The target string with all placeholders replaced by their corresponding values, or undefined if changed files string is undefined.
 */
export const replaceBodyParameters = (config, target, customMessage1, customMessage2, commitInfo) => {
  const changedFilesString = generateChangedFilesString(config, commitInfo?.changedFiles, '\n\n')
  if (changedFilesString === undefined) {
    return undefined
  }
  const labelsString = context.payload?.issue?.labels?.map((l) => l.name).join(', ')
  const displayIssueBody = makeIssueBody(config, context.payload?.issue?.body, '\n\n')
  const replacements = {
    GITHUB_RUN_NUMBER: context.runNumber,
    COMMIT_MESSAGE: commitInfo?.commitMessage,
    CUSTOM_MESSAGE_1: customMessage1,
    GITHUB_REPOSITORY: context.payload.repository?.name,
    BRANCH: getBranch(),
    GITHUB_EVENT_NAME: context.eventName,
    GITHUB_WORKFLOW: context.workflow,
    GITHUB_ACTOR: context.actor,
    GITHUB_SHA: commitInfo?.sha,
    CHANGED_FILES: changedFilesString,
    CUSTOM_MESSAGE_2: customMessage2,
    AUTHOR: commitInfo?.author,
    ISSUE_TITLE: context.payload?.issue?.title,
    ISSUE_LABELS: labelsString,
    ISSUE_MILESTONE: context.payload?.issue?.milestone?.title,
    ISSUE_BODY: displayIssueBody
  }

  // Placeholders live inside JSON strings; escape their values before parsing.
  const replacesStr = target.replace(/\{([A-Z_0-9]+)\}/g, (match, key) =>
    Object.hasOwn(replacements, key) ? JSON.stringify(String(replacements[key])).slice(1, -1) : match
  )

  core.group('Replaced data', () => core.info(replacesStr))
  return replacesStr
}
