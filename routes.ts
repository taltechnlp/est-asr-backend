import { Router } from "https://deno.land/x/oak@v10.1.0/mod.ts";
import { uploadFile, getUploadForm } from "./controllers/transcribe.ts";
import {
    addWeblog,
    getWorkflowProgress,
    getWorkflowProgressHtml,
    getResult,
} from "./controllers/workflows.ts";
import { deleteResults } from "./controllers/deleteResults.ts";

const router = new Router();
router
    .post("/upload", uploadFile)
    .get("/upload", getUploadForm)
    .get("/progress/:requestId", getWorkflowProgress)
    .get("/progress-html/:requestId", getWorkflowProgressHtml)
    .get("/result/:requestId", getResult)
    .post("/process", addWeblog)
    .post("/delete/:requestId", deleteResults)
export default router;
