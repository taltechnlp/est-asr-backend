import { Database } from "jsr:@db/sqlite@0.12";

const db = new Database("transcriptions.db");

export { db };