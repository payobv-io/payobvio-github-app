import { createNodeMiddleware, createProbot } from "probot";
import app from "../../src/app";
import { EscrowSetRequestBody } from "../../src/types";
import { escrowSetApproved, escrowSetRejected } from "../../src/functions/server";
import { VercelRequest, VercelResponse } from "@vercel/node";
import getRawBody from "raw-body";

const probot = createProbot();


export const config = {
  api: {
    bodyParser: true,
  },
};

// Escrow handling depending on the action (approved/rejected)
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

  const requestBody = parsedRequestBody as EscrowSetRequestBody;
  console.log(`Escrow Request Body: ${JSON.stringify(requestBody)}`);

  const { error, message } = requestBody.action === "approved"
      ? await escrowSetApproved(probot, requestBody.detail)
      : await escrowSetRejected(probot, requestBody.detail);

  if(error){
    return response.status(400).json({ error });
  } 
  return response.status(200).json({ message });
}