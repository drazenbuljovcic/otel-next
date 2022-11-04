const dotenv = require("dotenv");
dotenv.config({ path: "../.env.local" });

const { trace } = require("@opentelemetry/api");
const opentelemetry = require("@opentelemetry/sdk-node");
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
// const { registerInstrumentations } = require("@opentelemetry/instrumentation");
const {
  ExpressInstrumentation,
} = require("@opentelemetry/instrumentation-express");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  BatchSpanProcessor,
  SimpleSpanProcessor,
  ConsoleSpanExporter,
} = require("@opentelemetry/sdk-trace-base");
const { ZipkinExporter } = require("@opentelemetry/exporter-zipkin");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const {
  SemanticResourceAttributes,
} = require("@opentelemetry/semantic-conventions");
const { registerInstrumentations } = require("@opentelemetry/instrumentation");

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "server",
  }),
});
provider.register();

const getExporterHeaders = () => {
  if (process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT) {
    return {
      "x-honeycomb-team": process.env.NEXT_PUBLIC_OTEL_API_KEY,
      "x-honeycomb-dataset": process.env.NEXT_PUBLIC_OTEL_DATASET,
    };
  }

  return {};
};
console.log({
  url: process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT,
  getExporterHeaders: getExporterHeaders(),
});

const exporter = new OTLPTraceExporter({
  url: process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT,
  headers: {
    Authorization: getExporterHeaders(),
  },
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
// provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
provider.addSpanProcessor(new BatchSpanProcessor(new ZipkinExporter()));

// const sdk = new opentelemetry.NodeSDK({
//   traceExporter: exporter,
//   instrumentations: [getNodeAutoInstrumentations()],
// });

// sdk.start();
console.log("trace");

registerInstrumentations({
  instrumentations: [
    // Express instrumentation expects HTTP layer to be instrumented
    new HttpInstrumentation({
      requireParentforOutgoingSpans: true,
    }),
    new ExpressInstrumentation(),
  ],
});

const tracer = trace.getTracer("server");
module.exports = { tracer };
