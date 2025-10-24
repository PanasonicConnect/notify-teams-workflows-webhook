import { vi } from 'vitest'
import { context } from '../__fixtures__/context.js'
vi.mock('@actions/github', () => {
  return { context }
})

const resetContext = () => {
  context.runNumber = '123'
  context.payload = {
    repository: {
      name: 'test-repo'
    },
    pull_request: {
      head: {
        sha: 'abc123',
        ref: 'feature/branch'
      }
    },
    issue: {
      title: 'IssueTitle',
      body: 'IssueBody',
      labels: [{ name: 'IssueLabel1' }, { name: 'IssueLabel2' }],
      milestone: { title: 'IssueMilestone' },
      html_url: 'https;//github.com/test-user/test-repo/issues/1'
    }
  }
  context.ref = 'refs/heads/main'
  context.eventName = 'push'
  context.workflow = 'CI'
  context.actor = 'test-actor'
  context.sha = 'abc123'
  context.serverUrl = 'https://github.com'
}

const { makeCodeDefaultBody, makeIssueDefaultBody, makeAction, makeEntities, generateChangedFilesString } = await import('../src/contents.js')

const defaultCustomMassage = {
  customMessage1: 'Custom Message 1',
  customMessage2: 'Custom Message 2'
}

const defaultCommitInfo = {
  sha: 'abc123',
  commitMessage: 'Initial commit',
  changedFiles: ['file1.js', 'file2.js']
}

describe('makeCodeDefaultBody', () => {
  beforeEach(() => {
    resetContext()
  })
  it('should create a default body with all parameters', () => {
    const config = {
      visible: {
        repository_name: true,
        branch_name: true,
        workflow_name: true,
        event: true,
        actor: true,
        sha1: true,
        changed_files: true
      }
    }

    const body = makeCodeDefaultBody(config, defaultCustomMassage.customMessage1, defaultCustomMassage.customMessage2, defaultCommitInfo)
    console.log(body)
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
            title: 'Repository:',
            value: 'test-repo'
          },
          {
            title: 'Branch:',
            value: 'main'
          },
          {
            title: 'Workflow:',
            value: 'CI'
          },
          {
            title: 'Event:',
            value: 'push'
          },
          {
            title: 'Actor:',
            value: 'test-actor'
          },
          {
            title: 'SHA-1:',
            value: 'abc123'
          }
        ],
        id: 'acFactSet',
        separator: true
      },
      {
        type: 'TextBlock',
        text: 'Custom Message 2',
        separator: true,
        wrap: true
      },
      {
        type: 'TextBlock',
        text: '**Changed files:**',
        separator: true,
        wrap: true
      },
      {
        type: 'TextBlock',
        text: `\`file1.js\`

\`file2.js\``,
        size: 'small',
        wrap: false
      }
    ])
  })

  it('should create a default body without custom messages', () => {
    const customMessage1 = ''
    const customMessage2 = ''
    defaultCommitInfo
    const config = {
      visible: {
        repository_name: true,
        branch_name: true,
        workflow_name: true,
        event: true,
        actor: true,
        sha1: true,
        changed_files: true
      }
    }

    const body = makeCodeDefaultBody(config, customMessage1, customMessage2, defaultCommitInfo)
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
            title: 'Repository:',
            value: 'test-repo'
          },
          {
            title: 'Branch:',
            value: 'main'
          },
          {
            title: 'Workflow:',
            value: 'CI'
          },
          {
            title: 'Event:',
            value: 'push'
          },
          {
            title: 'Actor:',
            value: 'test-actor'
          },
          {
            title: 'SHA-1:',
            value: 'abc123'
          }
        ],
        id: 'acFactSet',
        separator: true
      },
      {
        type: 'TextBlock',
        text: '**Changed files:**',
        separator: true,
        wrap: true
      },
      {
        type: 'TextBlock',
        text: `\`file1.js\`

\`file2.js\``,
        size: 'small',
        wrap: false
      }
    ])
  })
  it('should create a default body without custom messages and changed files', () => {
    const commitInfo = {
      ...defaultCommitInfo,
      changedFiles: undefined
    }
    const config = {
      visible: {
        repository_name: true,
        branch_name: true,
        workflow_name: true,
        event: true,
        actor: true,
        sha1: true,
        changed_files: false
      }
    }

    const body = makeCodeDefaultBody(config, undefined, undefined, commitInfo)
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
            title: 'Repository:',
            value: 'test-repo'
          },
          {
            title: 'Branch:',
            value: 'main'
          },
          {
            title: 'Workflow:',
            value: 'CI'
          },
          {
            title: 'Event:',
            value: 'push'
          },
          {
            title: 'Actor:',
            value: 'test-actor'
          },
          {
            title: 'SHA-1:',
            value: 'abc123'
          }
        ],
        id: 'acFactSet',
        separator: true
      }
    ])
  })

  it('should create a default body based on config visibility', () => {
    const config = {
      visible: {
        repository_name: true,
        branch_name: false,
        workflow_name: true,
        event: false,
        actor: true,
        sha1: false,
        changed_files: true
      }
    }

    const body = makeCodeDefaultBody(config, defaultCustomMassage.customMessage1, defaultCustomMassage.customMessage2, defaultCommitInfo)

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
            title: 'Repository:',
            value: 'test-repo'
          },
          {
            title: 'Workflow:',
            value: 'CI'
          },
          {
            title: 'Actor:',
            value: 'test-actor'
          }
        ],
        id: 'acFactSet',
        separator: true
      },
      {
        type: 'TextBlock',
        text: 'Custom Message 2',
        separator: true,
        wrap: true
      },
      {
        type: 'TextBlock',
        text: '**Changed files:**',
        separator: true,
        wrap: true
      },
      {
        type: 'TextBlock',
        text: `\`file1.js\`

\`file2.js\``,
        size: 'small',
        wrap: false
      }
    ])
  })

  it('Test branch name on pull request event', () => {
    context.eventName = 'pull_request'

    const config = {
      visible: {
        branch_name: true,
        sha1: true
      }
    }

    const body = makeCodeDefaultBody(config, undefined, undefined, defaultCommitInfo)

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
            title: 'Branch:',
            value: 'feature/branch'
          },
          {
            title: 'SHA-1:',
            value: 'abc123'
          }
        ],
        id: 'acFactSet',
        separator: true
      }
    ])
  })
})

describe('makeIssueDefaultBody', () => {
  beforeEach(() => {
    resetContext()
  })

  it('create a default issue body with all parameters', () => {
    const config = {}

    const body = makeIssueDefaultBody(config, defaultCustomMassage.customMessage1, defaultCustomMassage.customMessage2)
    expect(body).toEqual([
      {
        type: 'TextBlock',
        text: 'IssueTitle',
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
            title: 'Labels:',
            value: 'IssueLabel1, IssueLabel2',
            size: 'small',
            wrap: false
          },
          {
            title: 'MileStone:',
            value: 'IssueMilestone'
          }
        ],
        id: 'acFactSet',
        separator: true
      },
      {
        type: 'TextBlock',
        text: 'IssueBody',
        size: 'small',
        separator: true,
        wrap: false
      },
      {
        type: 'TextBlock',
        text: 'Custom Message 2',
        separator: true,
        wrap: true
      }
    ])
  })

  it('should create a default issue body without custom messages', () => {
    const customMessage1 = ''
    const customMessage2 = ''
    const config = {}

    const body = makeIssueDefaultBody(config, customMessage1, customMessage2)
    expect(body).toEqual([
      {
        type: 'TextBlock',
        text: 'IssueTitle',
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
            title: 'Labels:',
            value: 'IssueLabel1, IssueLabel2',
            size: 'small',
            wrap: false
          },
          {
            title: 'MileStone:',
            value: 'IssueMilestone'
          }
        ],
        id: 'acFactSet',
        separator: true
      },
      {
        type: 'TextBlock',
        text: 'IssueBody',
        size: 'small',
        separator: true,
        wrap: false
      }
    ])
  })

  it('should create a default issue body based on multi line body restricted default max lines', () => {
    const config = {}
    context.payload.issue.body = `# IssueBody1
## IssueBody2
### IssueBody3
IssueBody4
IssueBody5
IssueBody6`

    const body = makeIssueDefaultBody(config, defaultCustomMassage.customMessage1, defaultCustomMassage.customMessage2)
    expect(body).toEqual([
      {
        type: 'TextBlock',
        text: 'IssueTitle',
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
            title: 'Labels:',
            value: 'IssueLabel1, IssueLabel2',
            size: 'small',
            wrap: false
          },
          {
            title: 'MileStone:',
            value: 'IssueMilestone'
          }
        ],
        id: 'acFactSet',
        separator: true
      },
      {
        type: 'TextBlock',
        text: `IssueBody1

IssueBody2

IssueBody3

IssueBody4

IssueBody5

...`,
        size: 'small',
        separator: true,
        wrap: false
      },
      {
        type: 'TextBlock',
        text: 'Custom Message 2',
        separator: true,
        wrap: true
      }
    ])
  })
  it('should create a default issue body based on multi line body restricted config issue.maxLines', () => {
    const config = {
      issue: {
        maxLines: 3
      }
    }
    context.payload.issue.body = `IssueBody1
IssueBody2
IssueBody3
IssueBody4
IssueBody5`

    const body = makeIssueDefaultBody(config, defaultCustomMassage.customMessage1, defaultCustomMassage.customMessage2)
    expect(body).toEqual([
      {
        type: 'TextBlock',
        text: 'IssueTitle',
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
            title: 'Labels:',
            value: 'IssueLabel1, IssueLabel2',
            size: 'small',
            wrap: false
          },
          {
            title: 'MileStone:',
            value: 'IssueMilestone'
          }
        ],
        id: 'acFactSet',
        separator: true
      },
      {
        type: 'TextBlock',
        text: `IssueBody1

IssueBody2

IssueBody3

...`,
        size: 'small',
        separator: true,
        wrap: false
      },
      {
        type: 'TextBlock',
        text: 'Custom Message 2',
        separator: true,
        wrap: true
      }
    ])
  })
})

describe('makeAction', () => {
  beforeEach(() => {
    // Setup context values that are used by getWorkflowUrl
    context.serverUrl = 'https://github.com'
    context.payload = {
      repository: { name: 'test-repo', html_url: 'https://github.com/test-repo' },
      issue: {
        title: 'IssueTitle',
        body: 'IssueBody', // todo 改行は？
        labels: [{ name: 'IssueLabel1' }, { name: 'IssueLabel2' }],
        milestone: { title: 'IssueMilestone' },
        html_url: 'https;//github.com/test-user/test-repo/issues/1'
      }
    }
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

  test('returns default action when titles and urls are empty by issue event', () => {
    context.eventName = 'issues'
    const actions = makeAction([], [])
    expect(actions).toHaveLength(1)
    expect(actions[0]).toEqual({
      type: 'Action.OpenUrl',
      title: 'View Issue',
      url: 'https;//github.com/test-user/test-repo/issues/1'
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

describe('generateChangedFilesString', () => {
  it('limits the number of displayed changed files to the max specified in config', () => {
    const config = {
      changedFile: {
        max: 5
      }
    }
    const changedFiles = Array.from({ length: 15 }, (_, i) => `file${i + 1}.txt`)
    const result = generateChangedFilesString(config, changedFiles)
    expect(result).toBe('`file1.txt`\\n\\n`file2.txt`\\n\\n`file3.txt`\\n\\n`file4.txt`\\n\\n`file5.txt`\\n\\n...')
  })
  it('limits the number of displayed changed files to the default value', () => {
    const changedFiles = Array.from({ length: 15 }, (_, i) => `file${i + 1}.txt`)
    const result = generateChangedFilesString({}, changedFiles)
    expect(result).toBe(
      '`file1.txt`\\n\\n`file2.txt`\\n\\n`file3.txt`\\n\\n`file4.txt`\\n\\n`file5.txt`\\n\\n`file6.txt`\\n\\n`file7.txt`\\n\\n`file8.txt`\\n\\n`file9.txt`\\n\\n`file10.txt`\\n\\n...'
    )
  })

  it('filters files by extension when extension filter is specified', () => {
    const config = {
      filter: {
        extension: ['.js', '.ts']
      },
      changedFile: {
        max: 10
      }
    }
    const changedFiles = ['file1.js', 'file2.ts', 'file3.txt', 'file4.js', 'file5.md', 'file6.ts']
    const result = generateChangedFilesString(config, changedFiles)
    expect(result).toBe('`file1.js`\\n\\n`file2.ts`\\n\\n`file4.js`\\n\\n`file6.ts`')
  })

  it('does not filter files when extension filter is empty array', () => {
    const config = {
      filter: {
        extension: []
      },
      changedFile: {
        max: 3
      }
    }
    const changedFiles = ['file1.js', 'file2.txt', 'file3.md']
    const result = generateChangedFilesString(config, changedFiles)
    expect(result).toBe('`file1.js`\\n\\n`file2.txt`\\n\\n`file3.md`')
  })

  it('does not filter files when extension filter is not specified', () => {
    const config = {
      changedFile: {
        max: 3
      }
    }
    const changedFiles = ['file1.js', 'file2.txt', 'file3.md']
    const result = generateChangedFilesString(config, changedFiles)
    expect(result).toBe('`file1.js`\\n\\n`file2.txt`\\n\\n`file3.md`')
  })

  it('filters files and applies max limit correctly', () => {
    const config = {
      filter: {
        extension: ['.js']
      },
      changedFile: {
        max: 2
      }
    }
    const changedFiles = ['file1.js', 'file2.txt', 'file3.js', 'file4.js', 'file5.md']
    const result = generateChangedFilesString(config, changedFiles)
    expect(result).toBe('`file1.js`\\n\\n`file3.js`\\n\\n...')
  })

  it('handles files without extension correctly', () => {
    const config = {
      filter: {
        extension: ['.js', '.ts']
      }
    }
    const changedFiles = ['Dockerfile', 'README', 'file1.js', 'Makefile', 'file2.ts']
    const result = generateChangedFilesString(config, changedFiles)
    expect(result).toBe('`file1.js`\\n\\n`file2.ts`')
  })

  it('returns empty string when all files are filtered out', () => {
    const config = {
      filter: {
        extension: ['.py']
      }
    }
    const changedFiles = ['file1.js', 'file2.txt', 'file3.md']
    const result = generateChangedFilesString(config, changedFiles)
    expect(result).toBe(undefined)
  })

  it('handles dotfiles correctly', () => {
    const config = {
      filter: {
        extension: ['.js']
      }
    }
    const changedFiles = ['.gitignore', '.env', 'file1.js', '.eslintrc.js']
    const result = generateChangedFilesString(config, changedFiles)
    expect(result).toBe('`file1.js`\\n\\n`.eslintrc.js`')
  })

  describe('mkdocs link generation', () => {
    it('converts markdown files to links when mkdocs config is provided', () => {
      const config = {
        mkdocs: {
          baseUrl: 'https://example.com',
          rootDir: 'docs'
        }
      }
      const changedFiles = ['docs/test/sample.md', 'src/main.js']
      const result = generateChangedFilesString(config, changedFiles)
      expect(result).toBe('[`docs/test/sample.md`](https://example.com/test/sample)\\n\\n`src/main.js`')
    })

    it('converts markdown files to links without rootDir prefix removal', () => {
      const config = {
        mkdocs: {
          baseUrl: 'https://example.com',
          rootDir: 'docs'
        }
      }
      const changedFiles = ['other/sample.md', 'docs/guide.md']
      const result = generateChangedFilesString(config, changedFiles)
      expect(result).toBe('`other/sample.md`\\n\\n[`docs/guide.md`](https://example.com/guide)')
    })

    it('handles base URL with trailing slash', () => {
      const config = {
        mkdocs: {
          baseUrl: 'https://example.com/',
          rootDir: 'docs'
        }
      }
      const changedFiles = ['docs/index.md']
      const result = generateChangedFilesString(config, changedFiles)
      expect(result).toBe('[`docs/index.md`](https://example.com/index)')
    })

    it('handles files without rootDir configuration', () => {
      const config = {
        mkdocs: {
          baseUrl: 'https://example.com'
        }
      }
      const changedFiles = ['README.md', 'src/main.js']
      const result = generateChangedFilesString(config, changedFiles)
      expect(result).toBe('[`README.md`](https://example.com/README)\\n\\n`src/main.js`')
    })

    it('does not convert non-markdown files to links', () => {
      const config = {
        mkdocs: {
          baseUrl: 'https://example.com',
          rootDir: 'docs'
        }
      }
      const changedFiles = ['docs/config.yml', 'docs/style.css', 'docs/guide.md']
      const result = generateChangedFilesString(config, changedFiles)
      expect(result).toBe('`docs/config.yml`\\n\\n`docs/style.css`\\n\\n[`docs/guide.md`](https://example.com/guide)')
    })

    it('handles nested markdown files correctly', () => {
      const config = {
        mkdocs: {
          baseUrl: 'https://example.com',
          rootDir: 'docs'
        }
      }
      const changedFiles = ['docs/api/v1/endpoints.md', 'docs/tutorials/getting-started.md']
      const result = generateChangedFilesString(config, changedFiles)
      expect(result).toBe(
        '[`docs/api/v1/endpoints.md`](https://example.com/api/v1/endpoints)\\n\\n[`docs/tutorials/getting-started.md`](https://example.com/tutorials/getting-started)'
      )
    })

    it('works without mkdocs configuration', () => {
      const config = {}
      const changedFiles = ['docs/guide.md', 'src/main.js']
      const result = generateChangedFilesString(config, changedFiles)
      expect(result).toBe('`docs/guide.md`\\n\\n`src/main.js`')
    })

    it('combines with extension filtering', () => {
      const config = {
        filter: {
          extension: ['.md']
        },
        mkdocs: {
          baseUrl: 'https://example.com',
          rootDir: 'docs'
        }
      }
      const changedFiles = ['docs/guide.md', 'src/main.js', 'docs/api.md']
      const result = generateChangedFilesString(config, changedFiles)
      expect(result).toBe('[`docs/guide.md`](https://example.com/guide)\\n\\n[`docs/api.md`](https://example.com/api)')
    })
  })
})

describe('makeEntities', () => {
  it('should return an empty array when users is empty', () => {
    const users = []
    const result = makeEntities(users)
    expect(result).toEqual([])
  })

  it('should return entities for multiple users', () => {
    const users = [
      { alias: 'user1', displayName: 'display name1', id: 'user1@domain' },
      { alias: 'user2', displayName: 'display name2', id: 'user2@domain' },
      { alias: 'user3', displayName: 'display name3', id: 'user3@domain' }
    ]
    const result = makeEntities(users)
    expect(result).toEqual([
      { type: 'mention', text: '<at>user1</at>', mentioned: { id: 'user1@domain', name: 'display name1' } },
      { type: 'mention', text: '<at>user2</at>', mentioned: { id: 'user2@domain', name: 'display name2' } },
      { type: 'mention', text: '<at>user3</at>', mentioned: { id: 'user3@domain', name: 'display name3' } }
    ])
  })
})
