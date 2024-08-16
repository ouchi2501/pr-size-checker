import * as core from '@actions/core'
import * as github from '@actions/github'
import { run } from '../src/main'

// Mock the GitHub Actions core library
jest.mock('@actions/core')
jest.mock('@actions/github')

describe('PR Size Check Action', () => {
  let mockGetInput: jest.SpyInstance
  let mockSetFailed: jest.SpyInstance
  let mockInfo: jest.SpyInstance
  let mockGetOctokit: jest.SpyInstance
  let mockOctokit: {
    rest: {
      pulls: {
        get: jest.Mock
      }
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetInput = jest.spyOn(core, 'getInput')
    mockSetFailed = jest.spyOn(core, 'setFailed')
    mockInfo = jest.spyOn(core, 'info')
    mockGetOctokit = jest.spyOn(github, 'getOctokit')
    mockOctokit = {
      rest: {
        pulls: {
          get: jest.fn()
        }
      }
    }
    mockGetOctokit.mockReturnValue(mockOctokit)

    // Mock github context
    ;(github.context as unknown) = {
      payload: {
        pull_request: {
          number: 1
        }
      },
      repo: {
        owner: 'testowner',
        repo: 'testrepo'
      }
    }
  })

  it('should pass when PR size is within limit', async () => {
    mockGetInput.mockImplementation((name: string) => {
      if (name === 'github-token') return 'fake-token'
      if (name === 'max-lines') return '300'
      return ''
    })

    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: 'diff\n'.repeat(200)
    })

    await run()

    expect(mockInfo).toHaveBeenCalledWith('PR changes: 201 lines')
    expect(mockInfo).toHaveBeenCalledWith('Maximum allowed lines: 300')
    expect(mockInfo).toHaveBeenCalledWith(
      'PR size is within the acceptable range.'
    )
    expect(mockSetFailed).not.toHaveBeenCalled()
  })

  it('should fail when PR size exceeds limit', async () => {
    mockGetInput.mockImplementation((name: string) => {
      if (name === 'github-token') return 'fake-token'
      if (name === 'max-lines') return '300'
      return ''
    })

    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: 'diff\n'.repeat(400)
    })

    await run()

    expect(mockInfo).toHaveBeenCalledWith('PR changes: 401 lines')
    expect(mockInfo).toHaveBeenCalledWith('Maximum allowed lines: 300')
    expect(mockSetFailed).toHaveBeenCalledWith(
      'PR size is too large. 401 lines changed (max 300)'
    )
  })

  it('should handle invalid max-lines input', async () => {
    mockGetInput.mockImplementation((name: string) => {
      if (name === 'github-token') return 'fake-token'
      if (name === 'max-lines') return 'not-a-number'
      return ''
    })

    await run()

    expect(mockSetFailed).toHaveBeenCalledWith(
      'Invalid value for max-lines: not-a-number'
    )
  })
})
