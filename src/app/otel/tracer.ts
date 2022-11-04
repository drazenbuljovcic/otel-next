import {
  trace,
  Span,
  // ROOT_CONTEXT,
  // ContextManager,
  // Context,
} from "@opentelemetry/api";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { XMLHttpRequestInstrumentation } from "@opentelemetry/instrumentation-xml-http-request";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { ZipkinExporter } from "@opentelemetry/exporter-zipkin";

// class AlwaysSameContextManager implements ContextManager {
//   static theContext = ROOT_CONTEXT;
//   active(): Context {
//     return AlwaysSameContextManager.theContext;
//   }
//   with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
//     _context: Context,
//     fn: F,
//     thisArg?: ThisParameterType<F>,
//     ...args: A
//   ): ReturnType<F> {
//     return Reflect.apply(fn, thisArg, args);
//   }
//   bind<T>(_context: Context, target: T): T {
//     return target;
//   }
//   enable(): this {
//     return this;
//   }
//   disable(): this {
//     return this;
//   }
// }

const applyCustomAttributesOnSpan = (span: Span) => {
  return span;
};

if (
  typeof window !== "undefined"
  // process.env.NEXT_PUBLIC_OTEL_COLLECTOR_URL
) {
  const provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]:
        process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME,
    }),
  });
  console.log({
    NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT:
      process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT,
  });

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

  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.addSpanProcessor(new BatchSpanProcessor(new ZipkinExporter()));
  console.log({ provider });
  provider.register({
    contextManager: new ZoneContextManager().enable(),
  });
  // provider.register({
  //   contextManager: new AlwaysSameContextManager().enable(),
  // });

  registerInstrumentations({
    instrumentations: [
      new XMLHttpRequestInstrumentation({
        // local domain requests attach tracing headers by default `propagateTraceHeaderCorsUrls`
        applyCustomAttributesOnSpan,
        propagateTraceHeaderCorsUrls: ["http://localhost:3001/api"],
      }),
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: ["http://localhost:3001/api"],
      }),
    ],
  });
}

const tracer = trace.getTracer(
  process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME as string
);
// const rootSpan = tracer.startSpan("RootSpan");
// console.log({ rootSpan });
// AlwaysSameContextManager.theContext = trace.setSpan(ROOT_CONTEXT, rootSpan);

// tracer.startSpan("a").end(); // child of RootSpan
// tracer.startSpan("b").end(); // child of RootSpan
// tracer.startActiveSpan("c", (span) => {
//   // child of RootSpan
//   tracer.startSpan("d").end(); // even this is a child of RootSpan!
//   span.end();
// });

export { tracer };
