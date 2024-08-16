import * as core from '@actions/core'
import * as github from '@actions/github'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true })
    const maxLines = parseInt(
      core.getInput('max-lines', { required: true }),
      10
    )

    if (isNaN(maxLines)) {
      throw new Error(
        `Invalid value for max-lines: ${core.getInput('max-lines')}`
      )
    }

    const octokit = github.getOctokit(token)

    const { pull_request } = github.context.payload
    if (!pull_request) {
      throw new Error('This action can only be run on pull requests')
    }

    const { data } = await octokit.rest.pulls.get({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: pull_request.number,
      mediaType: {
        format: 'diff'
      }
    })

    const diffLines = (data as unknown as string).split('\n').length

    // Log the results
    core.info(`PR changes: ${diffLines} lines`)
    core.info(`Maximum allowed lines: ${maxLines}`)

    // Check if the number of lines exceeds the maximum
    if (diffLines > maxLines) {
      core.setFailed(
        `PR size is too large. ${diffLines} lines changed (max ${maxLines})`
      )
    } else {
      core.info('PR size is within the acceptable range.')
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
