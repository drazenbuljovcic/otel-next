const express = require("express");
const axios = require("axios");
const { tracer } = require("./tracer");
const { SpanStatusCode } = require("@opentelemetry/api");
const app = express();

app.use(async (req, res, next) => {
  return tracer.startActiveSpan("cors", async () => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    res.setHeader("Access-Control-Allow-Headers", "traceparent");
    next();
  });
});

app.get("/api", async (req, res) => {
  return tracer.startActiveSpan("api", async (span) => {
    try {
      const apiRes = await axios.get(
        "https://jsonplaceholder.typicode.com/todos/1"
      );
      // await new Promise((resolve, reject) => {
      //   setTimeout(resolve, 1000);
      // });
      console.log({ headers: req.headers });
      res.status(200).send({ data: apiRes.data });
    } catch (thrown) {
      // span.setStatus({
      //   code: SpanStatusCode.error,
      // });
      const error = thrown;
      console.error(error);
    } finally {
      console.log({ span });
      span.end();
    }
  });
});

app.listen(3001, () => {
  console.log("Proxy server listening on port 3001!");
});
