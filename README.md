# Next.js instrumentation POC

<img width="582" alt="image" src="https://user-images.githubusercontent.com/18490172/200163757-06253dfb-764a-485b-9445-26d5b6f2e704.png">

[We have a deployed client application](https://otel-next.vercel.app)

The `trace` button sends a request to the `/api` endpoint - which is an API route.
Both the browser and the API function are instrumented. That means they will produce a `trace_id` for the lifecycle of the request and the `span_id` for the respective piece of work being done by each process.

The standardized way of achieving this propagation is using the `traceparent` header defined in the [spec](https://www.w3.org/TR/trace-context/#examples-of-http-traceparent-headers). All services should conform to this standard to produce proper output.

| **traceparent** | browser  | api | _downstream_services_
| - | - | - | - |
| **trace_id** | span_id | span_id |  ...

<img width="908" alt="image" src="https://user-images.githubusercontent.com/18490172/200163364-886417a7-cce7-4e95-8692-90c4f7d949ee.png">

> Locally running an instance of the otel collector [zipkin](https://zipkin.io/) the output would look something like this - this is already a big boost in reliability of our observability stack!

⋅ Run the docker container and access http://localhost:9411 to get the to the UI
```bash
$ docker run --rm -d -p 9411:9411 --name zipkin openzipkin/zipkin 
```
⋅ Press the `Trace` button and find the request `/api` in the network devtools
⋅ Obtain the `trace_id` | header **traceparent**: 00-**dd0530acd5e4e85d4d7c69c8a3df6d71**-ae543dd039963173-01

<img width="994" alt="image" src="https://user-images.githubusercontent.com/18490172/200162826-595bff8f-109f-4f97-8d9f-d5cfb4bf0fec.png">

> Powered by [honeycomb](https://www.honeycomb.io)
> [Preview env](https://ui.honeycomb.io/zeen-obs/environments/test/result/3mELDaaStQR?tab=raw)
