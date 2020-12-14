# serverless_oak

A simple library for mapping AWS API Gateway events to/from an Oak application.

## Usage

```typescript
import type {
  APIGatewayProxyEvent,
  Context,
} from "https://deno.land/x/lambda/mod.ts";
import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import type { RouterContext } from "https://deno.land/x/oak/mod.ts";
import { handler } from "https://deno.land/x/serverless_oak/mod.ts";

const router = new Router();
router
  .get("/echo", (context: RouterContext) => {
    context.response.body = "Hey!";
  })
  .get("/echo/:text", (context: RouterContext) => {
    context.response.body = context.params.text;
  });

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

export const Echo = async (event: APIGatewayProxyEvent, context: Context) => {
  return handler(event, context, app);
};

export default {
  Echo,
};
```

## License

MIT

## Thanks

_Inspired by [serverless-express](https://github.com/vendia/serverless-express) for Node. <3_
