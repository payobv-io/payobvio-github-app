import { Probot, Context, ApplicationFunctionOptions } from "probot";
import { addRepositoriesInstallation, handleBountySet, handlePullRequestMerge, handlePullRequestOpen, isIncludesBounty, removeRepositoriesInstallation } from "./functions/client.js";
import { bountyReleased, escrowSetApproved, escrowSetRejected } from "./functions/server.js";
import * as express from "express";
import { BountyReleasedDetail, EscrowSetRequestBody } from "./types.js";

export default (app: Probot, {
  getRouter
}: ApplicationFunctionOptions) => {
  app.log.info("App was loaded");

  // Express Routes
  if(getRouter){
    const router = getRouter("/payobvio-github-app");

    // Middleware
    router.use(express.json());

    // Health Check
    router.get("/", (_, response) => {
      response.status(200).json({ message: "Hello World" });
    });

    // Escrow Success Route
    router.post("/escrow", async (request, response) => {
      const requestBody = request.body as EscrowSetRequestBody;

      // Escrow handling depending on the action (approved/rejected)
      const { error, message } = requestBody.action === "approved"
      ? await escrowSetApproved(app, requestBody.detail)
      : await escrowSetRejected(app, requestBody.detail);

        if(error){
          return response.status(400).json({ error });
        } 
        return response.status(200).json({ message });
    });

    // Escrow Released
    router.post("/escrow-released", async (request, response) => {
      const requestBody = request.body as BountyReleasedDetail;

      const { error, message } = await bountyReleased(app, requestBody);

      if(error){
        return response.status(400).json({ error });
      }
      return response.status(200).json({ message });
    })
  }

  /**
   * Issue Comment Created
   * - Get Bounty from comment (When user comments with bounty)
   * - Comment on the issue with the bounty set message
   */
  app.on("issue_comment.created", async (context: Context<"issue_comment.created">) => {
    const { issue, comment } = context.payload;
    const commentBody = comment.body;
    const issueUser = issue.user.login;
    const commentUser = comment.user.login;

    /**
     * Dont proceed if:
     * - Comment is by a Bot
     * - Comment is not by the issue creator
     */
    if (comment.user.type === "Bot" || commentUser !== issueUser) {
      return;
    }

    // Bounty Comment
    if(isIncludesBounty(commentBody)) {
      context.log.info("Bounty Comment: ", commentBody);
      await handleBountySet<"issue_comment.created">(context, commentBody);
    }
  });

  /**
   * Issue Opened
   * - Get Bounty from issue body (When user creates an issue with bounty)
   * - Comment on the issue with the bounty set message
   */
  app.on("issues.opened", async (context: Context<"issues.opened">) => {
    const issue = context.payload.issue;
    const issueBody = issue.body;
    if(!issueBody){
      return
    }
    
    // Bounty Body
    if(isIncludesBounty(issueBody)) {
      context.log.info("Bounty Body: ", issueBody);
      await handleBountySet<"issues.opened">(context, issueBody);
    }
  })

  app.on('installation.created', async (context: Context<"installation.created">) => {
    if(context.payload.repositories){
      await addRepositoriesInstallation(context, context.payload.repositories);
    }
  });

  /**
   * Installation Repositories Added
   * - Add Repositories Installation to the Web Host Database
   */
  app.on("installation_repositories.added", async (context: Context<"installation_repositories.added">) => {
    await addRepositoriesInstallation(context, context.payload.repositories_added);
  });

  /**
   * Installation Repositories Removed
   * - Remove Repositories Installation from the Web Host Database
   */
  app.on("installation_repositories.removed", async (context: Context<"installation_repositories.removed">) => {
    await removeRepositoriesInstallation(context, context.payload.repositories_removed); 
  });

  /**
   * Pull Request Opened
   * - Comment on the Pull Request if the issue its associated with has a bounty
   */
  app.on("pull_request.opened", async (context: Context<"pull_request.opened">) => {
    await handlePullRequestOpen(context);
  });

  app.on("pull_request.closed", async (context: Context<"pull_request">) => {
    const isMerged = context.payload.pull_request.merged;
    app.log.info(`Is pull request merged? : ${isMerged}`);
    app.log.info(context.payload.pull_request);
    app.log.info(context.payload)
    if(isMerged){
      await handlePullRequestMerge(context);
    }
  })
};

