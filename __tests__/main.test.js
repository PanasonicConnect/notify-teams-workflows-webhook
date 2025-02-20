import { vi } from 'vitest'
import * as core from '../__fixtures__/core.js'
import { context } from '../__fixtures__/context.js'
import * as exec from '../__fixtures__/exec.js'

vi.mock('@actions/core', () => core)
vi.mock('@actions/github', () => {
  return { context }
})
vi.mock('@actions/exec', () => exec)

const resetContext = () => {
  context.runNumber = '123'
  context.payload = {
    repository: {
      name: 'test-repo'
    },
    pull_request: {
      head: {
        sha: 'pr-sha1',
        ref: 'feature/branch'
      }
    }
  }
  context.ref = 'refs/heads/main'
  context.eventName = 'push'
  context.workflow = 'CI'
  context.actor = 'test-actor'
  context.sha = 'abc123'
  context.serverUrl = 'https://github.com'
}

const { run } = await import('../src/main.js')

describe('Custom Action Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    resetContext()

    exec.getExecOutput.mockImplementation((commandLine, args, options) => {
      if (args[0] === 'show') {
        return { stdout: 'first line\nsecond line' }
      }
      if (args[0] === 'log') {
        return { stdout: 'dummy author' }
      }
      return { stdout: 'dummy output' }
    })
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve({ ok: true, statusText: 'OK' }))
  })

  it('sends correct adaptive card payload when no template is provided', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'token') return 'dummyToken'
      if (name === 'webhook-url') return 'https://dummy.url'
      if (name === 'template') return ''
      if (name === 'message1') return 'dummyMessage1'
      if (name === 'message2') return 'dummyMessage2'
      if (name === 'action-titles') return 'Title1\nTitle2'
      if (name === 'action-urls') return 'https://url1\nhttps://url2'
      return ''
    })

    await run()

    // Validate that fetch was called with the expected parameters.
    expect(fetch).toHaveBeenCalledWith(
      'https://dummy.url',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: expect.any(String)
      })
    )
    const fetchCall = fetch.mock.calls[0][1]
    const requestBody = JSON.parse(fetchCall.body)
    expect(requestBody).toEqual(
      expect.objectContaining({
        attachments: expect.any(Array)
      })
    )
  })

  it('sends correct adaptive card payload when no template is provided and multi action urls', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'token') return 'dummyToken'
      if (name === 'webhook-url') return 'https://dummy.url'
      if (name === 'template') return ''
      if (name === 'message1') return 'dummyMessage1'
      if (name === 'message2') return 'dummyMessage2'
      if (name === 'action-titles') return 'Title1\nTitle2'
      if (name === 'action-urls') return 'https://url1\nhttps://url2'
      return ''
    })

    await run()

    const expectedActions = [
      {
        type: 'Action.OpenUrl',
        title: 'Title1',
        url: 'https://url1'
      },
      {
        type: 'Action.OpenUrl',
        title: 'Title2',
        url: 'https://url2'
      }
    ]
    expect(fetch).toHaveBeenCalledWith(
      'https://dummy.url',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: expect.any(String)
      })
    )
    const fetchCall = fetch.mock.calls[0][1]
    const requestBody = JSON.parse(fetchCall.body)
    expect(requestBody.attachments[0].content.actions).toEqual(expectedActions)
  })

  it('sends adaptive card payload using template', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'token') return 'dummyToken'
      if (name === 'webhook-url') return 'https://dummy.url'
      if (name === 'template') return './__tests__/assets/template.json' // test
      if (name === 'message1') return 'dummyMessage1'
      if (name === 'message2') return 'dummyMessage2'
      if (name === 'action-titles') return 'Title1'
      if (name === 'action-urls') return 'https://url1'
      return ''
    })

    await run()

    const expectedTemplate = [
      { type: 'TextBlock', text: '123', wrap: true },
      { type: 'TextBlock', text: 'first line', wrap: true },
      { type: 'TextBlock', text: 'dummyMessage1', wrap: true },
      { type: 'TextBlock', text: 'test-repo', wrap: true },
      { type: 'TextBlock', text: 'main', wrap: true },
      { type: 'TextBlock', text: 'push', wrap: true },
      { type: 'TextBlock', text: 'CI', wrap: true },
      { type: 'TextBlock', text: 'test-actor', wrap: true },
      { type: 'TextBlock', text: 'abc123', wrap: true },
      { type: 'TextBlock', text: '\`dummy output\`', wrap: true },
      { type: 'TextBlock', text: 'dummyMessage2', wrap: true },
      { type: 'TextBlock', text: 'dummy author', wrap: true }
    ]
    const expectedActions = [
      {
        type: 'Action.OpenUrl',
        title: 'Title1',
        url: 'https://url1'
      }
    ]

    expect(fetch).toHaveBeenCalledWith(
      'https://dummy.url',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: expect.any(String)
      })
    )

    const fetchCall = fetch.mock.calls[0][1]
    const requestBody = JSON.parse(fetchCall.body)
    expect(requestBody).toEqual(
      expect.objectContaining({
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: expect.objectContaining({
              body: expectedTemplate,
              actions: expectedActions
            })
          }
        ]
      })
    )
  })

  it('calls core.setFailed if an error occurs during execution', async () => {
    // Force getInput to throw an error.
    core.getInput.mockImplementation((name) => {
      throw new Error('dummy error')
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('dummy error')
  })

  it('calls core.setFailed when template file cannot be opened', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'token') return 'dummyToken'
      if (name === 'webhook-url') return 'https://dummy.url'
      if (name === 'template') return './nonexistent/template.json' // test
      if (name === 'message1') return 'dummyMessage1'
      if (name === 'message2') return 'dummyMessage2'
      if (name === 'action-titles') return ''
      if (name === 'action-urls') return ''
      return ''
    })
    await run()
    expect(core.setFailed).toHaveBeenCalled()
    expect(core.setFailed.mock.calls[0][0]).toMatch(/Failed to load template/)
  })

  it('calls core.setFailed when config file cannot be opened', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'token') return 'dummyToken'
      if (name === 'webhook-url') return 'https://dummy.url'
      if (name === 'template') return ''
      if (name === 'config') return './nonexistent/config.json' // test
      if (name === 'message1') return 'dummyMessage1'
      if (name === 'message2') return 'dummyMessage2'
      if (name === 'action-titles') return ''
      if (name === 'action-urls') return ''
      return ''
    })
    await run()
    expect(core.setFailed).toHaveBeenCalled()
  })

  it('calls core.setFailed when webhook responds with non-ok status', async () => {
    global.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, statusText: 'Internal Server Error' }))
    core.getInput.mockImplementation((name) => {
      if (name === 'token') return 'dummyToken'
      if (name === 'webhook-url') return 'https://dummy.url'
      if (name === 'template') return ''
      if (name === 'message1') return 'dummyMessage1'
      if (name === 'message2') return 'dummyMessage2'
      if (name === 'action-titles') return 'Title1\nTitle2'
      if (name === 'action-urls') return 'https://url1\nhttps://url2'
      return ''
    })
    await run()
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringMatching(/Request failed: Internal Server Error/))
  })

  it('does not send notification if commit message contains ignore keyword', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'token') return 'dummyToken'
      if (name === 'webhook-url') return 'https://dummy.url'
      if (name === 'template') return ''
      if (name === 'message1') return 'dummyMessage1'
      if (name === 'message2') return 'dummyMessage2'
      if (name === 'action-titles') return 'Title1\nTitle2'
      if (name === 'action-urls') return 'https://url1\nhttps://url2'
      if (name === 'config') return './__tests__/assets/config-ignore.json' // test
      return ''
    })

    // Mock the commit message to include the ignore keyword
    exec.getExecOutput.mockImplementation(() => ({ stdout: 'typo: fixed a typo' }))

    await run()

    // Validate that fetch was not called
    expect(fetch).not.toHaveBeenCalled()
  })
  it('Notify if the Notify Ignore keyword is set but not included in the commit message', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'token') return 'dummyToken'
      if (name === 'webhook-url') return 'https://dummy.url'
      if (name === 'template') return ''
      if (name === 'message1') return 'dummyMessage1'
      if (name === 'message2') return 'dummyMessage2'
      if (name === 'action-titles') return 'Title1\nTitle2'
      if (name === 'action-urls') return 'https://url1\nhttps://url2'
      if (name === 'config') return './__tests__/assets/config-ignore.json'
      return ''
    })

    // Mock the commit message to include the ignore keyword
    exec.getExecOutput.mockImplementation(() => ({ stdout: 'fixed a typo' }))

    await run()

    // Validate that fetch was not called
    expect(fetch).toHaveBeenCalled()
  })
  it('If the commit message is multi-line, only the first line is used', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'token') return 'dummyToken'
      if (name === 'webhook-url') return 'https://dummy.url'
      if (name === 'template') return './__tests__/assets/template.json'
      if (name === 'message1') return 'dummyMessage1'
      if (name === 'message2') return 'dummyMessage2'
      if (name === 'action-titles') return 'Title1'
      if (name === 'action-urls') return 'https://url1'
      if (name === 'config') return './__tests__/assets/config-ignore.json'
      return ''
    })

    exec.getExecOutput.mockImplementation((commandLine, args, options) => {
      if (args[0] === 'show') {
        return { stdout: 'first line\nsecond line' }
      }
      if (args[0] === 'log') {
        return { stdout: 'dummy author' }
      }
      return { stdout: 'dummy output' }
    })

    await run()

    // Validate that fetch was not called
    expect(fetch).toHaveBeenCalled()
    const fetchCall = fetch.mock.calls[0][1]
    const requestBody = JSON.parse(fetchCall.body)

    const expectedTemplate = [
      { type: 'TextBlock', text: '123', wrap: true },
      { type: 'TextBlock', text: 'first line', wrap: true }, // first line\nsecond line -> first line
      { type: 'TextBlock', text: 'dummyMessage1', wrap: true },
      { type: 'TextBlock', text: 'test-repo', wrap: true },
      { type: 'TextBlock', text: 'main', wrap: true },
      { type: 'TextBlock', text: 'push', wrap: true },
      { type: 'TextBlock', text: 'CI', wrap: true },
      { type: 'TextBlock', text: 'test-actor', wrap: true },
      { type: 'TextBlock', text: 'abc123', wrap: true },
      { type: 'TextBlock', text: '`dummy output`', wrap: true },
      { type: 'TextBlock', text: 'dummyMessage2', wrap: true },
      { type: 'TextBlock', text: 'dummy author', wrap: true }
    ]
    expect(requestBody?.attachments[0].content.body).toEqual(expectedTemplate)
  })

  it('Testing at pull request', async () => {
    context.eventName = 'pull_request'

    core.getInput.mockImplementation((name) => {
      if (name === 'token') return 'dummyToken'
      if (name === 'webhook-url') return 'https://dummy.url'
      if (name === 'template') return './__tests__/assets/template.json'
      if (name === 'message1') return 'dummyMessage1'
      if (name === 'message2') return 'dummyMessage2'
      if (name === 'action-titles') return 'Title1'
      if (name === 'action-urls') return 'https://url1'
      if (name === 'config') return './__tests__/assets/config-ignore.json'
      return ''
    })

    exec.getExecOutput.mockImplementation((commandLine, args, options) => {
      if (args[0] === 'show') {
        return { stdout: 'first line\nsecond line' }
      }
      if (args[0] === 'log') {
        return { stdout: 'dummy author' }
      }
      return { stdout: 'dummy output' }
    })

    await run()

    // Validate that fetch was not called
    expect(fetch).toHaveBeenCalled()
    const fetchCall = fetch.mock.calls[0][1]
    const requestBody = JSON.parse(fetchCall.body)

    const expectedTemplate = [
      { type: 'TextBlock', text: '123', wrap: true },
      { type: 'TextBlock', text: 'first line', wrap: true }, // first line\nsecond line -> first line
      { type: 'TextBlock', text: 'dummyMessage1', wrap: true },
      { type: 'TextBlock', text: 'test-repo', wrap: true },
      { type: 'TextBlock', text: 'feature/branch', wrap: true },
      { type: 'TextBlock', text: 'pull_request', wrap: true }, // push -> pull_request
      { type: 'TextBlock', text: 'CI', wrap: true },
      { type: 'TextBlock', text: 'test-actor', wrap: true },
      { type: 'TextBlock', text: 'pr-sha1', wrap: true }, // abc123 -> pr-sha1
      { type: 'TextBlock', text: '`dummy output`', wrap: true },
      { type: 'TextBlock', text: 'dummyMessage2', wrap: true },
      { type: 'TextBlock', text: 'dummy author', wrap: true }
    ]
    expect(requestBody?.attachments[0].content.body).toEqual(expectedTemplate)
  })
})
