import { createNodeMiddleware, createProbot } from "probot";
import app from "../../src/app";
import { BountyReleasedDetail, EscrowSetRequestBody } from "../../src/types";
import { bountyReleased, escrowSetApproved, escrowSetRejected } from "../../src/functions/server";
import { VercelRequest, VercelResponse } from "@vercel/node";
import getRawBody from "raw-body";

const probot = createProbot();

// Escrow Released
export default async function (request: VercelRequest, response: VercelResponse) {

  if(request.method !== "POST") {
    return response.status(404).json({ message: "Not Found" });
  }

  const middleware = createNodeMiddleware(app, {
    probot
  });

  middleware(request, response);

  const requestBodyBuffer = await getRawBody(request);
  const parsedRequestBody = JSON.parse(requestBodyBuffer.toString());

  const requestBody = parsedRequestBody as BountyReleasedDetail;

  const { error, message } = await bountyReleased(probot, requestBody);

  if(error){
    return response.status(400).json({ error });
  }
  return response.status(200).json({ message });
}