import { decode, StringReader } from "./deps.ts";
import type {
  APIGatewayProxyEvent,
  Application,
  Context
} from "./deps.ts";

// deno-lint-ignore no-explicit-any
const isReader = (value: any): value is Deno.Reader =>
  value &&
  typeof value === "object" &&
  "read" in value &&
  typeof value.read === "function";

const eventBody = (event: APIGatewayProxyEvent): string =>
  event.isBase64Encoded ? window.atob(event.body || "") : event.body || "";

const eventUrl = (event: APIGatewayProxyEvent): string => {
  if (event.queryStringParameters) {
    return `${event.path}?${Object.keys(event.queryStringParameters)
      .map((k) => `${k}=${event.queryStringParameters![k]}`)
      .join("&")}`;
  }
  return event.path;
};

export const serverRequest = (
  event: APIGatewayProxyEvent,
  context: Context
): Request => {
  const headers = new Headers(event.headers as any ?? undefined);
  const url = eventUrl(event);
  const body = <Deno.Reader>new StringReader(event.body ?? "");

  if (event.body && !headers.get("Content-Length")) {
    const body = eventBody(event);
    headers.set("Content-Length", decode(body).byteLength.toString());
  }
  const clonedEvent = JSON.parse(JSON.stringify(event));
  delete clonedEvent.body;
  headers.set("x-apigateway-event", JSON.stringify(clonedEvent));
  headers.set("x-apigateway-context", JSON.stringify(context));

  return {
    method: event.httpMethod,
    url,
    headers: headers,
    body,
  } as unknown as Request;
};

export const apiGatewayResponse = async (response?: Response) => {
  if (!response) {
    return { statusCode: 500 };
  }
  if (!response.body) {
    return { statusCode: response.status };
  }
  let arrayBuf;
  if (isReader(response.body)) {
    const buf = new Uint8Array(1024);
    const n = (await response.body.read(buf)) as number;
    arrayBuf = buf.subarray(0, n);
  } else {
    const result = await response.body.getReader().read();
    arrayBuf = result.value;
  }
  const rawHeaders: { [key: string]: string } = {};
  response.headers.forEach((value: string, key: string) => (rawHeaders[key] = value));
  return {
    statusCode: response.status,
    body: new TextDecoder().decode(arrayBuf).trim(),
    headers: rawHeaders,
  };
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  app: Application
) => {
  const request = serverRequest(event, context);
  const response = await app.handle(request);
  return apiGatewayResponse(response);
};
