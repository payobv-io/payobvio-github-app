// Add reusable functions to use when this app acts as a client
import { Context } from "probot";
import { ENDPOINTS, MESSAGES, PATTERNS } from "../constants.js";
import { BountySetRequestBody, InstallationRepositoriesRequestBody, ReleaseBountyPayload, RemoveRepositoriesRequestBody, Repository } from "../types.js";

// Function to extract the bounty amount from a comment
const getBounty = (comment: string): number => {
  const bounty = comment.match(PATTERNS.BOUNTY);
  if(!bounty){
    return 0;
  }
  return Number.parseFloat(bounty[0]);
}

const getIssueNumber = (comment: string): number => {
  const issueNumber = comment.match(PATTERNS.ISSUE_NUMBER);
  return Number.parseFloat(issueNumber![0]);
}

// Function to check if a comment is a bounty comment
export const isIncludesBounty = (comment: string): boolean => {
  return PATTERNS.BOUNTY.test(comment);
}

export const isIncludesIssueNumber = (comment: string): boolean => {
  return PATTERNS.ISSUE_NUMBER.test(comment);
}

/**
 * Handle Bounty Set
 * 1. Get Bounty from comment (When user comments with bounty)
 * 2. Send POST request to bounties endpoint
 * 3. Comment on the issue with the bounty set message after a successful POST request
 */
export const handleBountySet = async <T extends "issue_comment.created" | "issues.opened">(
  context: Context<T> ,
  comment: string
): Promise<void> => {
  const bounty = getBounty(comment);

  context.log.info(`Bounty: ${bounty}, installationID: ${context.payload.installation?.id}`);
  
  if(bounty <= 0) {
    context.log.error(`Error Setting Bounty: ${MESSAGES. INVALID_BOUNTY}`);
    return
  }

  // Send POST request to bounties endpoint
  const payload: BountySetRequestBody = {
    bounty,
    issueNumber: context.payload.issue.number,
    title: context.payload.issue.title,
    authorId: context.payload.issue.user.id,
    repositoryId: context.payload.repository.id
  }

  try {
    const response = await fetch(ENDPOINTS.BOUNTIES, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    })

    if(!response.ok){
      throw new Error();
    }
  
    // Comment on the issue with the bounty set message
    const message = MESSAGES.BOUNTY_SET(bounty);
    const comment = context.issue({ body: message });
    context.log.info(`Comment: ${comment}`);
    await context.octokit.issues.createComment(comment);
    context.log.info(message);

  } catch (error) {
    context.log.error(`Error Setting Bounty: ${MESSAGES.BOUNTY_SET_ERROR}`);
  }
}

/**
 * Add Repositories Installation
 * - Send POST request to installations endpoint
 */
export const addRepositoriesInstallation = async (context: Context<"installation_repositories.added">, repositories: Repository[]): Promise<void> => {
  const installationId = context.payload.installation.id;
  const userId = context.payload.installation.account.id;
  const installationRepositories = repositories.map((repo) => ({
    id: repo.id,
    name: repo.full_name,
    isPrivate: repo.private,
  }));

  const payload: InstallationRepositoriesRequestBody = {
    userId,
    installationId,
    repositories: installationRepositories
  }

  try {
    const response = await fetch(ENDPOINTS.REPOSITORIES_INSTALLATION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    })

    if(!response.ok){
      throw new Error();
    }

    const data = await response.json();
    context.log.info(`Repositories Added: ${data.count}`);

  } catch (error) {
    context.log.error(`Error Adding Repositories: ${MESSAGES.ADD_REPOSITORY_INSTALLATION_ERROR}`);
  }
}

export const removeRepositoriesInstallation = async (context: Context<"installation_repositories.removed">, repositories: Repository[]): Promise<void> => {
  const userId = context.payload.installation.account.id;
  const repositoriesToBeRemoved = repositories.map((repo) => repo.id);

  const payload: RemoveRepositoriesRequestBody = {
    userId,
    repositories: repositoriesToBeRemoved
  }

  try {
    const response = await fetch(ENDPOINTS.REPOSITORIES_INSTALLATION, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    })

    if(!response.ok){
      throw new Error();
    }

    const data = await response.json();
    context.log.info(`Repositories Removed: ${data.count}`);

  } catch (error) {
    context.log.error(`Error Removing Repositories: ${MESSAGES.REMOVE_REPOSITORY_INSTALLATION_ERROR}`);
  }
}

/**
 * Pull Request Opened
 * - Check if the PR body contains an issue number
 * - Send GET request to bounties endpoint to check if the issue is a bounty issue
 * - Comment on the PR with the bounty set message if the issue is a bounty issue
 */
export const handlePullRequestOpen = async (context: Context<"pull_request.opened">): Promise<void> => {
  context.log.info("Pull Request Opened");

  const pullRequestBody = context.payload.pull_request.body;
  const authorGithubId = context.payload.pull_request.user.login;
  const repositoryId = context.payload.repository.id;
  if(!pullRequestBody){
    return
  }

  if(isIncludesIssueNumber(pullRequestBody)) {
    const issueNumber = getIssueNumber(pullRequestBody);
    const url = ENDPOINTS.CHECK_BOUNTY(repositoryId, issueNumber);
    context.log.info(`Sending GET request to: ${url}`);
    
    try {
      // Send GET request to bounties endpoint
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      })

      if(!response.ok){
        throw new Error();
      }

      const data = await response.json();
      const isBountyIssue = data.isBounty;
      const bounty = data.bounty;

      if(!isBountyIssue){
        return;
      }

      const message = MESSAGES.PR_OPEN(authorGithubId, bounty);

      // Comment on the PR with the bounty set message
      const comment = context.issue({ body: message });
      context.log.info(`Comment: ${comment}`);
      await context.octokit.issues.createComment(comment);
    } catch (error) {
      context.log.error("Error Checking Bounty");
    }
  }
}

/**
 * Pull Request Merge
 * - Send POST request to release bounty endpoint
 * - Comment on the Issue with the bounty release message
 * - Add the Rewarded label to the issue
 * - Close the issue
 */
export const handlePullRequestMerge = async (context: Context<"pull_request.closed">): Promise<void> => {
  context.log.info("Pull Request Merged");
  const pullRequestBody = context.payload.pull_request.body;
  const authorId = context.payload.pull_request.user.id;
  const authorGithubId = context.payload.pull_request.user.login;
  const repositoryId = context.payload.repository.id;
  const pullRequestNumber = context.payload.pull_request.number;
  const repoOwner = context.payload.repository.owner.login;
  const repoName = context.payload.repository.name;
  const mergeBranch = context.payload.pull_request.base.ref;

  context.log.info(`Pull Request Body: ${pullRequestBody}, Merge Branch: ${mergeBranch}, Author ID: ${authorId}, Repository ID: ${repositoryId}, Pull Request Number: ${pullRequestNumber}, Repo Owner: ${repoOwner}, Repo Name: ${repoName}, issueNumber: ${getIssueNumber(pullRequestBody ?? "")}`);

  if(!pullRequestBody || !isIncludesIssueNumber(pullRequestBody) || !mergeBranch || mergeBranch !== "main") {
    return
  }

  const issueNumber = getIssueNumber(pullRequestBody);
  const url = ENDPOINTS.RELEASE_BOUNTY
  const payload: ReleaseBountyPayload = {
    repositoryId,
    issueNumber,
    authorId,
    pullRequestNumber
  }

  try {
    context.log.info(`Sending POST request to: ${url}`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    }) 

    if(!response.ok){
      throw new Error();
    }

    const data = await response.json();

    // Comment on the Issue with the bounty release message
    const octokitPayload = {
      owner: repoOwner,
      repo: repoName,
      issue_number: issueNumber
    }
    const message = MESSAGES.PR_MERGE(authorGithubId, data.bounty);
    await context.octokit.issues.createComment({
      ...octokitPayload,
      body: message
    });

    // Add the Rewarded label to the issue
    await context.octokit.issues.addLabels({
      ...octokitPayload,
      labels: ["Awaiting Bounty Release"]
    });

    await context.octokit.issues.update({
      ...octokitPayload,
      state: "closed"
    });

  } catch (error) {
    context.log.error("Error Releasing Bounty");
  }

}