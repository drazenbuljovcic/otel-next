// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import withOpenTelemetry from "../../src/server/withOpenTelemetry";
import client from "../../src/server/api/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const response = await client.get("http://localhost:3001/api");
  return res.status(200).json(response.data);
};

export default withOpenTelemetry(handler);
