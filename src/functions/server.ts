// Add reusable functions to use when this app acts as a server
import { Probot } from "probot";
import { BountyReleasedDetail, EscrowSetDetail } from "../types";
import { LABELS, LINKS, MESSAGES } from "../constants";

/**
 * Escrow Success (After a Successfull POST request from the client)
 * - Comment on the issue with the bounty set message
 * - Update the Issue title and append [Bounty: 100 SOL]
 * - Add a label to the issue(100 SOL Escrowed)
 */
export const escrowSetApproved = async (app: Probot, requestBody: EscrowSetDetail): Promise<{
  error: boolean,
  message: string
}> => {
  try {
    const {
      owner, 
      repo,
      issueNumber: issue_number,
      bounty,
      installationId
    } = requestBody;

    app.log.info(app);
    const octokit = await app.auth(installationId);
    app.log.info(requestBody);


    const payload = {
      owner,
      repo,
      issue_number
    }
  
    /**
     * issue_number: 16
      owner: "ASHWIN776"
      repo: "test-my-repo"
      body: "Bounty set to 100 SOL, awaiting escrow."
      */
    await octokit.rest.issues.createComment({
      ...payload,
      body: `Bounty of $${bounty} has been escrowed`
    });

    // Update Issue ----------------
    /**
     * 1. Update the Issue title and append [Bounty: 100 SOL]
     * 2. Add a label to the issue
     */
    const {data: issue} = await octokit.issues.get(payload);

    // Change the Issue title and append [Bounty: 100 SOL]
    const updateIssueTitle =  octokit.issues.update({
      ...payload,
      title: `${issue.title} [Bounty: ${bounty} SOL]`
    });

    // Add a label to the issue
    const addLabel = octokit.issues.addLabels({
      ...payload,
      labels: [`${bounty} SOL Escrowed`]
    });

    // Run all promises concurrently
    await Promise.all([updateIssueTitle, addLabel]);
    // ----------------------------

    return {
      error: false,
      message: "Bounty Escrowed"
    }
  } catch (error) {
    return {
      error: true,
      message: error as string
    }
  }
}

/**
 * Escrow Rejected (After a POST request from the client)
 * - Comment on the issue with with the bounty rejected message
 */
export const escrowSetRejected = async (app: Probot, requestBody: EscrowSetDetail): Promise<{
  error: boolean,
  message: string
}> => { 
  try {
    const {
      owner, 
      repo,
      issueNumber: issue_number,
      installationId
    } = requestBody;

    const octokit = await app.auth(installationId);

    const payload = {
      owner,
      repo,
      issue_number
    }

    await octokit.rest.issues.createComment({
      ...payload,
      body: `Escrow Rejected. This issue does not have a bounty anymore.`
    });

    return {
      error: false,
      message: "Bounty Rejected"
    }
  } catch (error) {
    return {
      error: true,
      message: error as string
    }
  }
    
}

/**
 * Bounty Released (After a POST request from the client)
 * - Comment on the issue with the bounty released message
 * - Remove the awaiting bounty release label
 * - Update the escrowed label to released
 */
export const bountyReleased = async (app: Probot, requestBody: BountyReleasedDetail): Promise<{
  error: boolean,
  message: string
}> => {
  try {
    const {
      owner, 
      repo,
      issueNumber: issue_number,
      installationId,
      authorGithubId,
      transactionSignature,
      bounty
    } = requestBody;

    const octokit = await app.auth(installationId);

    const payload = {
      owner,
      repo,
      issue_number
    }

    // Comment on the issue with the bounty released message
    const createCommentPromise = octokit.rest.issues.createComment({
      ...payload,
      body: MESSAGES.BOUNTY_RELEASE(authorGithubId, bounty, LINKS.SOLANA_EXPLORER(transactionSignature))
    });

    // Remove the awaiting bounty release label
    const removeLabelPromise = octokit.issues.removeLabel({
      ...payload,
      name: LABELS.AWAITING_BOUNTY_RELEASE
    });

    // Update the escrowed label to released
    const updateLabelPromise = octokit.issues.updateLabel({
      ...payload,
      name: LABELS.ESCROWED(bounty),
      new_name: LABELS.RELEASED(bounty)
    });

    // Run all promises concurrently
    await Promise.all([createCommentPromise, removeLabelPromise, updateLabelPromise]);
    
    app.log.info("Bounty Released");
    return {
      error: false,
      message: "Bounty Released"
    }
  } catch (error) {
    app.log.error(`Error Releasing Bounty: ${error}`);
    return {
      error: true,
      message: error as string
    }
  }
}