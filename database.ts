import { Pool } from "https://deno.land/x/postgres/mod.ts";
import "https://deno.land/x/dotenv/load.ts";

const POOL_CONNECTIONS = 5;

const dbPool = new Pool(
    {
        user: Deno.env.get("DB_USER"),
        database: Deno.env.get("DB_NAME"),
        hostname: Deno.env.get("DB_HOSTNAME"),
        password: Deno.env.get("DB_PASSWORD"),
        port: parseInt(Deno.env.get("DB_PORT")!),
        tls: { enforce: false },
    },
    POOL_CONNECTIONS
);

const RESULTS_DIR = Deno.env.get("RESULTS_DIR");

export { dbPool, RESULTS_DIR };
