import * as domain from "domain";

import { NextApiRequest, NextApiResponse, NextApiHandler } from "next";
import { ZipkinExporter } from "@opentelemetry/exporter-zipkin";
import {
  ROOT_CONTEXT,
  trace,
  context,
  propagation,
  SpanStatusCode,
  Span,
  SpanKind,
} from "@opentelemetry/api";

import { Resource } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

export const initOpenTelemetrySDK = (): NodeTracerProvider | undefined => {
  const rootProvider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]:
        process.env.OTEL_API_SERVICE_NAME,
    }),
  });

  rootProvider.register();

  const getExporterHeaders = () => {
    if (process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT) {
      return {
        "x-honeycomb-team": process.env.NEXT_PUBLIC_OTEL_API_KEY,
        "x-honeycomb-dataset": process.env.NEXT_PUBLIC_OTEL_DATASET,
      };
    }

    return {};
  };
  const exporter = new OTLPTraceExporter({
    url: process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: getExporterHeaders(),
  });

  rootProvider.addSpanProcessor(new BatchSpanProcessor(exporter));
  rootProvider.addSpanProcessor(new BatchSpanProcessor(new ZipkinExporter()));

  return rootProvider;
};

// inspired by https://github.com/getsentry/sentry-javascript/blob/3b76a628b6403c1470a0191d8aec526de1f9d404/packages/nextjs/src/utils/withSentry.ts#L165-L171
export function wrapEndMethod(
  originalEnd: NextApiResponse["end"],
  rootProvider: NodeTracerProvider
): any {
  // NextApiResponse["end"]
  return async function newEnd(this: NextApiResponse, ...args: unknown[]) {
    try {
      // pushing the spans to the next event loop so open spans have a better chance of finishing before the
      // transaction closes, and make sure to wait until that's done before flushing events
      const flushingFinished = new Promise<void>((resolve) => {
        setImmediate(async () => {
          try {
            await rootProvider.forceFlush();
          } catch (e) {
            console.error(
              "could not flush traces to the OpenTelemetry Collector",
              e
            );
          } finally {
            resolve();
          }
        });
      });
      await flushingFinished;
    } finally {
      // Receive the original response object
      // Resolve the original end method with the end response
      // Pass in arguments resolved from the handler
      // eslint-disable-next-line
      // @ts-expect-error
      return originalEnd.apply(this, args);
    }
  };
}

const openTelemetryApiRouteWrapper =
  (
    originalHandler: NextApiHandler,
    req: NextApiRequest,
    res: NextApiResponse
  ) =>
  async (): Promise<unknown> => {
    let rootSpan: Span;

    // Create a ROOT span for the API Route
    // Export trace context from parent span - `traceparent` header
    const ctx = propagation.extract(ROOT_CONTEXT, req.headers);

    console.log({ ctx, headers: req.headers });
    const url = new URL(req.url as string, `https://${req.headers.host}`);
    const pathname = url.pathname;

    const tracer = trace.getTracer(process.env.OTEL_API_SERVICE_NAME as string);
    rootSpan = tracer.startSpan(
      `HTTP ${req.method} ${url.pathname}`,
      { kind: SpanKind.SERVER },

      ctx
    );

    try {
      let handlerResult: unknown;

      // Start the handler under the process ROOT span
      const requestContext = trace.setSpan(ctx, rootSpan);
      await context
        .with(requestContext, async () => {
          // https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/trace/semantic_conventions/http.md#http-server-semantic-conventions
          rootSpan.setAttributes({
            "http.route": pathname,
            "http.url": pathname,
            "http.method": req.method,
            "http.host": url.host,
            "http.client_ip": req.headers["x-forwarded-for"],
            "http.user_agent": req.headers["user-agent"],
            "http.referer": req.headers.referer,
            "http.scheme": url.protocol,
            "http.target": url.pathname,
            "net.host.name": url.host,
          });
          rootSpan.addEvent("handlerStart", Date.now());
          // Execute the handler
          handlerResult = await originalHandler(req, res);

          rootSpan.setStatus({
            code: SpanStatusCode.OK,
          });
        })
        // Catch the handler error and bubble it up the the tracer error handler
        .catch((e) => {
          throw e;
        });

      return handlerResult;
    } catch (e) {
      const error = e as Error;
      rootSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error?.message,
      });
      rootSpan.recordException(
        error ||
          `Error executing ${process.env.OTEL_API_SERVICE_NAME} handler!`,
        Date.now()
      );
      rootSpan.setAttribute("echo.error", error?.message);
      // re-throw original error so it's available to the vercel infra
      throw e;
    } finally {
      console.log({ rootSpan });
      rootSpan.addEvent("handlerEnd", Date.now());
      rootSpan.setAttribute("http.status", res.statusCode);
      rootSpan.setAttribute("http.status_text", res.statusMessage);
      // end the ROOT span
      rootSpan.end();
    }
  };

const rootProvider = initOpenTelemetrySDK();

const withOpenTelemetry =
  (originalHandler: NextApiHandler) =>
  async (req: NextApiRequest, res: NextApiResponse): Promise<unknown> => {
    if (!rootProvider) {
      return;
    }

    // wrap `res.end()` so that it will wait for us to export traces before shutting down the lambda
    res.end = wrapEndMethod(res.end, rootProvider);

    // use a domain in order to prevent scope bleed between requests
    const local = domain.create();
    local.add(req);
    local.add(res);

    const boundHandler = local.bind(
      openTelemetryApiRouteWrapper(originalHandler, req, res)
    );

    return boundHandler();
  };

export default withOpenTelemetry;
