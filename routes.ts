import { Router }from 'https://deno.land/x/oak/mod.ts'
import { 
    uploadFile, getUploadForm 
} from './controllers/transcribe.ts'
import { addWeblog } from './controllers/workflows.ts'

const router = new Router()
router  .post("/upload", uploadFile) 
        .get('/upload', getUploadForm) 
        .post('/process', addWeblog)

export default router