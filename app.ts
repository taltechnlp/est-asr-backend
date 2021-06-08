import { Application, Context} from 'https://deno.land/x/oak/mod.ts'
import router from './routes.ts'

const env = Deno.env.toObject()
const HOST = env.HOST 
const PORT = env.PORT 

const app: Application = new Application();

// Logger
// deno-lint-ignore no-explicit-any
app.use(async (ctx: Context, next: any) => {
    await next();
    const rt = ctx.response.headers.get("X-Response-Time");
    console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
});

app.use(router.routes())
app.use(router.allowedMethods())

console.log(`Listening on ${HOST}:${PORT} ...`)
await app.listen(`${HOST}:${PORT}`)

/* import { readerFromStreamReader } from "https://deno.land/std/io/mod.ts";
const listener = Deno.listen({ port: 5000 });
for await(const conn of listener) {
    for await(const { request, respondWith } of Deno.serveHttp(conn)) {
        const wrdr=request?.body?.getReader();
        if(wrdr) {
            const r=readerFromStreamReader(wrdr);
            const file=await Deno.open('tulem.txt', {create: true, write: true});
            await Deno.copy(r, file);
            file.close();
            await respondWith(new Response(undefined, {status: 200}));
        }
    }
} */