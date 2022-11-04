// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import withOpenTelemetry from "../../src/server/withOpenTelemetry";
import client from "../../src/server/api/client";
import { AxiosError } from "axios";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const response = await client.get("http://localhost:3001/api");
    return res.status(200).json(response.data);
  } catch (thrown) {
    const error = thrown as AxiosError;
    return res
      .status(error.status || 500)
      .json({ message: error.response?.statusText });
  }
};

export default withOpenTelemetry(handler);
