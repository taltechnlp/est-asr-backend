import { readLines, readerFromStreamReader } from "https://deno.land/std/io/mod.ts";
import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";
import { format } from 'https://deno.land/std@0.97.0/datetime/mod.ts'
import {dbPool} from "../database.ts";

interface FormDataFile {
  content: string,
  contentType: string,
  name: string,
  filename: string,
  originalName: string,
} 

const maxSizeBytes = 2000000000

const uploadFile = async ({ request, response, params }: { request: any, response: any, params: any }) => { 
    if (request.hasBody) {
        if (
          parseInt(request.headers.get("content-length")) > maxSizeBytes
        ) {
          response.status = 422
          response.body = {
            success: false,
            data: `Maximum upload size exceeded, size: ${
              request.headers.get("content-length")
            } bytes, maximum: ${maxSizeBytes} bytes. `
          }
        }
        else {
          const body = await request.body({ type: "form-data" })
          // The outPath folder has to exist
          const formData = await body.value.read({maxFileSize: maxSizeBytes, outPath: "./uploads"});
          console.log(formData)
          const fileUUID = v4.generate();
          /* const data: AsyncIterableIterator<[string, string | FormDataFile]> = await body.value.stream()
          //console.log(await data.next())
          for await (const chunk of data) {
            console.log(chunk);
          } */

          // const formData = await body.value.read({ maxSize: 5000000 }); // 5MB maximum file size
          // console.log(formData)
          /* const result = await request.body({ type: "reader" })
          // const folder = format(new Date(), "dd-MM-yyyy")
          // ensureDirSync(`./${folder}`)

          const file = await Deno.open(`${fileUUID}.mp3`, {create: true, write: true});
          await Deno.copy(result.value, file);
          file.close(); */
          const dbClient = await dbPool.connect()
          const time = new Date().toISOString()
          const result = await dbClient.queryArray(`
            INSERT INTO public.workflows
            ("requestId", "createdAtUtc", "status", "location", "extension") 
            VALUES ('${fileUUID}', '${time}', 'queued', '${formData.files[0].filename}', '${formData.files[0].extension}')`) 
          console.log(result)
          await dbClient.release();
          response.status = 201
          response.body = {
            success: true,
            data: "ok",
            requestId: fileUUID
          }
        }
        // response.redirect('/')
    }
    else {
        response.status = 400
        console.log("POST failed")
        response.body = {
            success: false,
            msg: 'No data included.'
        }
    }
}

const getUploadForm = ({ response }: { response: any }) => { 
  response.headers.set("Content-Type", "text/html; charset=utf-8")
  response.body = `
    <h3>Deno Oak framework</h3>
    <form action="/upload" enctype="multipart/form-data" method="post" >
      <div>Text field title: <input type="text" name="title" /></div>
      <div>File: <input type="file" name="singleFile"/></div>
      <input type="submit" value="Upload" />
    </form>
    
  `
}

export {uploadFile, getUploadForm}

// extensions: ['wav', 'mp3', 'ogg', 'mp2', 'm4a', 'mp4', 'flac', 'amr', 'mpg'], maxSizeBytes: 400000000, maxFileSizeBytes: 200000000 }

/* function getFileExtension(filename) {
  var ext = /^.+\.([^.]+)$/.exec(filename);
  return ext == null ? "" : ext[1];
}

const postUpload= ({ response }: { response: any }) => { 
    const callback = null
    const xRequestId = null
    response.body = shapes 
} */