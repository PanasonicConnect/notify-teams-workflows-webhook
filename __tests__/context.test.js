import { vi } from 'vitest'
import { context } from '../__fixtures__/context.js'
vi.mock('@actions/github', () => {
  return { context }
})

context.runNumber = '123'
context.runId = '123456'
context.payload = {
  repository: {
    name: 'test-repo'
  }
}
context.ref = 'refs/heads/main'
context.eventName = 'push'
context.workflow = 'CI'
context.actor = 'test-actor'
context.sha = 'abc123'
context.serverUrl = 'https://github.com'

const { makeDefaultBody, makeAction } = await import('../src/contents.js')

describe('makeDefaultBody', () => {
  it('should create a default body with all parameters', () => {
    const customMessage1 = 'Custom Message 1'
    const customMessage2 = 'Custom Message 2'
    const commitMessage = 'Initial commit'
    const changedFiles = ['file1.js', 'file2.js']

    const body = makeDefaultBody(customMessage1, customMessage2, commitMessage, changedFiles)

    expect(body).toEqual([
      {
        type: 'TextBlock',
        text: '#123 Initial commit',
        id: 'Title',
        spacing: 'Medium',
        size: 'large',
        weight: 'Bolder',
        color: 'Accent'
      },
      {
        type: 'TextBlock',
        text: 'Custom Message 1',
        separator: true,
        wrap: true
      },
      {
        type: 'FactSet',
        facts: [
          {
            title: 'Repository/Branch:',
            value: 'test-repo / main'
          },
          {
            title: 'Workflow/Event/Actor:',
            value: 'CI / push / test-actor'
          },
          {
            title: 'SHA-1:',
            value: 'abc123'
          },
          {
            title: 'Changed files:',
            value: `\`file1.js\`

\`file2.js\``
          }
        ],
        id: 'acFactSet'
      },
      {
        type: 'TextBlock',
        text: 'Custom Message 2',
        separator: true,
        wrap: true
      }
    ])
  })

  it('should create a default body without custom messages', () => {
    const customMessage1 = ''
    const customMessage2 = ''
    const commitMessage = 'Initial commit'
    const changedFiles = ['file1.js', 'file2.js']

    const body = makeDefaultBody(customMessage1, customMessage2, commitMessage, changedFiles)
    expect(body).toEqual([
      {
        type: 'TextBlock',
        text: '#123 Initial commit',
        id: 'Title',
        spacing: 'Medium',
        size: 'large',
        weight: 'Bolder',
        color: 'Accent'
      },
      {
        type: 'FactSet',
        facts: [
          {
            title: 'Repository/Branch:',
            value: 'test-repo / main'
          },
          {
            title: 'Workflow/Event/Actor:',
            value: 'CI / push / test-actor'
          },
          {
            title: 'SHA-1:',
            value: 'abc123'
          },
          {
            title: 'Changed files:',
            value: `\`file1.js\`

\`file2.js\``
          }
        ],
        id: 'acFactSet'
      }
    ])
  })
  it('should create a default body without custom messages and changed files', () => {
    const customMessage1 = ''
    const customMessage2 = ''
    const commitMessage = 'Initial commit'

    const body = makeDefaultBody(customMessage1, customMessage2, commitMessage, undefined)
    expect(body).toEqual([
      {
        type: 'TextBlock',
        text: '#123 Initial commit',
        id: 'Title',
        spacing: 'Medium',
        size: 'large',
        weight: 'Bolder',
        color: 'Accent'
      },
      {
        type: 'FactSet',
        facts: [
          {
            title: 'Repository/Branch:',
            value: 'test-repo / main'
          },
          {
            title: 'Workflow/Event/Actor:',
            value: 'CI / push / test-actor'
          },
          {
            title: 'SHA-1:',
            value: 'abc123'
          }
        ],
        id: 'acFactSet'
      }
    ])
  })
})

describe('makeAction', () => {
  beforeEach(() => {
    // Setup context values that are used by getWorkflowUrl
    context.serverUrl = 'https://github.com'
    context.payload = { repository: { name: 'test-repo', html_url: 'https://github.com/test-repo' } }
    context.runNumber = '123'
    context.runId = '123456'
    // Other context values, though not used by makeAction directly
    context.ref = 'refs/heads/main'
    context.eventName = 'push'
    context.workflow = 'CI'
    context.actor = 'test-actor'
    context.sha = 'abc123'
  })

  test('returns default action when titles and urls are empty', () => {
    const actions = makeAction([], [])
    expect(actions).toHaveLength(1)
    expect(actions[0]).toEqual({
      type: 'Action.OpenUrl',
      title: 'View Workflow',
      url: 'https://github.com/test-repo/actions/runs/123456'
    })
  })

  test('returns actions for provided titles and urls', () => {
    const titles = ['Open Homepage', 'View Docs']
    const urls = ['https://example.com', 'https://docs.example.com']
    const actions = makeAction(titles, urls)
    expect(actions).toHaveLength(2)
    expect(actions[0]).toEqual({
      type: 'Action.OpenUrl',
      title: titles[0],
      url: urls[0]
    })
    expect(actions[1]).toEqual({
      type: 'Action.OpenUrl',
      title: titles[1],
      url: urls[1]
    })
  })

  test('throws error when titles and urls have different lengths', () => {
    expect(() => makeAction(['Action 1'], [])).toThrow('Action titles and URLs must have the same length.')
  })

  test('throws error if any action title or url is missing', () => {
    const titles = ['Valid Action', '']
    const urls = ['https://example.com', 'https://missing.com']
    expect(() => makeAction(titles, urls)).toThrow('Action parameters must contain a title and URL.')
  })
})
