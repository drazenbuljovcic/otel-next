import {
  context,
  propagation,
  Span,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";

/**
 * This API client is only or use on the server side (API routes)
 */
const client = axios.create();

export interface HttpRequestConfig extends AxiosRequestConfig {
  /** Used to pass around the span entity from the request to the response to handle the lifecycle of the request */
  tracingSpan: Span;
  /** Pass additional otel parameters from the context of the executable to enrich the traces */
  otelAttributes: Record<string, string>;
}
export interface HttpClientResponse extends AxiosResponse {
  ok: boolean;
}

const attachOpenTelemetryInterceptors = (clientInstance: AxiosInstance) => {
  clientInstance.interceptors.request.use((config: HttpRequestConfig) => {
    const tracer = trace.getTracer(process.env.OTEL_API_SERVICE_NAME as string);
    const parentContext = context.active();
    const span = tracer.startSpan(
      `HTTP ${config.method} ${config.url}`,
      {
        kind: SpanKind.SERVER,
      },
      parentContext
    );

    Object.keys(config.otelAttributes || {}).forEach((attr) => {
      span.setAttribute(attr, config.otelAttributes[attr]);
    });
    span.setAttribute("http.url", config.url as string);
    span.setAttribute("http.method", config.method as string);
    span.setAttribute("net.peer.name", new URL(config.url as string).host);
    // setOrgSpanAttributes(span);
    const requestContext = trace.setSpan(parentContext, span);
    const headers = {};
    propagation.inject(requestContext, headers);
    Object.keys(headers).forEach((key) => {
      config.headers = {
        ...config.headers,
        [key]: headers[key],
      };
    });
    config.tracingSpan = span;

    return config;
  });

  clientInstance.interceptors.response.use(
    (response: HttpClientResponse) => {
      const requestSpan = (response?.config as HttpRequestConfig).tracingSpan;

      requestSpan.setStatus({
        code: SpanStatusCode.OK,
      });
      requestSpan.setAttribute("http.status_code", response?.status);
      requestSpan.end();
      return response;
    },
    (error: AxiosError) => {
      if (process.env.ENVIRONMENT === "production") {
        // captureException(error);

        const requestSpan = (error.response?.config as HttpRequestConfig)
          .tracingSpan;

        requestSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.response?.statusText,
        });
        requestSpan.setAttribute(
          "http.status_code",
          error.response?.status || 0
        );
        requestSpan.setAttribute(
          "http.status_text",
          error.response?.statusText || ""
        );
        requestSpan?.recordException(error.message, Date.now());
        requestSpan.end();
      }
      return Promise.reject(error);
    }
  );
};

attachOpenTelemetryInterceptors(client);

export default client;
