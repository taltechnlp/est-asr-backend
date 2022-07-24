import { Application, Context } from "https://deno.land/x/oak@v10.1.0/mod.ts";
import router from "./routes.ts";
import { dotEnvConfig } from './deps.ts';
  
dotEnvConfig({ export: true, safe: true });
console.log(dotEnvConfig({}));

const HOST = Deno.env.get('APP_HOST');
const PORT = Deno.env.get('APP_PORT');

const app: Application = new Application();

// Logger
// deno-lint-ignore no-explicit-any
app.use(async (ctx: Context, next: any) => {
    await next();
    const rt = ctx.response.headers.get("X-Response-Time");
    console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log(`Listening on ${HOST}:${PORT} ...`);
await app.listen(`${HOST}:${PORT}`);
