const express = require("express");
const axios = require("axios");
const { tracer } = require("./tracer");
const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Headers", "traceparent");
  next();
});

app.get("/api", async (req, res) => {
  // await tracer.startActiveSpan("server job", async () => {
  const apiRes = await axios.get(
    "https://jsonplaceholder.typicode.com/todos/1"
  );
  // await new Promise((resolve, reject) => {
  //   setTimeout(resolve, 1000);
  // });
  console.log({ headers: req.headers });
  res.status(200).send({ data: apiRes.data });
  // });
});

app.listen(3001, () => {
  console.log("Proxy server listening on port 3001!");
});
