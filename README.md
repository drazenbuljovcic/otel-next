# Next.js instrumentation POC

### Please check the [issue](https://github.com/drazenbuljovcic/otel-next/issues/1) for motivation

<img width="582" alt="image" src="https://user-images.githubusercontent.com/18490172/200163757-06253dfb-764a-485b-9445-26d5b6f2e704.png">

> [We have a deployed client application](https://otel-next.vercel.app)

The `trace` button sends a request to the `/api` endpoint - which is an API route.
Both the browser and the API function are instrumented. That means they will produce a `trace_id` for the lifecycle of the request and the `span_id` for the respective piece of work being done by each process.

The standardized way of achieving this propagation is using the `traceparent` header defined in the [spec](https://www.w3.org/TR/trace-context/#examples-of-http-traceparent-headers). All services should conform to this standard to produce proper output.

| **traceparent** | browser | api     | server 1 | _downstream_services_ |
| --------------- | ------- | ------- | -------- | --------------------- |
| **trace_id**    | span_id | span_id | span_id  | ...                   |

<img width="908" alt="image" src="https://user-images.githubusercontent.com/18490172/200163364-886417a7-cce7-4e95-8692-90c4f7d949ee.png">

> Locally running an instance of the otel collector [zipkin](https://zipkin.io/) the output would look something like this - this is already a big boost in reliability of our observability stack!

⋅ Run the docker container and access http://localhost:9411 to get the to the UI

```bash
$ docker run --rm -d -p 9411:9411 --name zipkin openzipkin/zipkin
```

⋅ Press the `Trace` button and find the request `/api` in the network devtools
⋅ Obtain the `trace_id` | header **traceparent**: 00-_**dd0530acd5e4e85d4d7c69c8a3df6d71**_-ae543dd039963173-01
⋅ Please also check the developer console in which you can observe the details of the created span

---

The tool that can be used to preview the waterfall information is [honeycomb](https://www.honeycomb.io). Honeycomb is a cloud solution that brings a lot value to development teams, and whole engineering organizations. It provides additional benefits to whole distributed systems observability stack by defining SLOs and Error budgets that can route alerts to SRE tools like OpsGenie.
Additionally, this tool is great for rapid iterative debugging in cases of production issues.

<img width="994" alt="image" src="https://user-images.githubusercontent.com/18490172/200162826-595bff8f-109f-4f97-8d9f-d5cfb4bf0fec.png">

Attributes that are attached to certain spans can provide information about the specific process that was running at the time - like attaching ids that were generated or pieces of output which was produced.

> [Preview env](https://ui.honeycomb.io/zeen-obs/environments/test/result/3mELDaaStQR?tab=raw)
> 🔴 Unfortunately honeycomb does not support publicly shareable dashboard displaying traces</font>
