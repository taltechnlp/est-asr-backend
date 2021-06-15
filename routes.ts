import { Router }from 'https://deno.land/x/oak/mod.ts'
import { 
    uploadFile, getUploadForm
} from './controllers/transcribe.ts'
import { addWeblog, getWorkflowProgress, getResult } from './controllers/workflows.ts'

const router = new Router()
router  .post("/upload", uploadFile) 
        .get('/upload', getUploadForm) 
        .get('/progress/:requestId', getWorkflowProgress)
        .get('/result/:requestId', getResult)
        .post('/process', addWeblog)

export default router