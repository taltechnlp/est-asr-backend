import { RESULTS_DIR } from "../database.ts";
import { db } from "../sqlite.ts";
const PIPELINE_DIR = Deno.env.get("PIPELINE_DIR");
const NEXTFLOW_PATH =
  (Deno.env.get("NEXTFLOW_PATH")
    ? Deno.env.get("NEXTFLOW_PATH")
    : "nextflow") as string;
const UPLOAD_DIR = Deno.env.get("UPLOAD_DIR");
const APP_HOST = Deno.env.get("APP_HOST");
const APP_PORT = Deno.env.get("APP_PORT");

interface FormDataFile {
  content: string;
  contentType: string;
  name: string;
  filename: string;
  originalName: string;
}

const MAX_SIZE_BYTES = 2000000000;

const uploadFile = async ({
  request,
  response,
}: {
  // deno-lint-ignore no-explicit-any
  request: any;
  // deno-lint-ignore no-explicit-any
  response: any;
  // deno-lint-ignore no-explicit-any
  params: any;
}) => {
  if (request.hasBody) {
    if (parseInt(request.headers.get("content-length")) > MAX_SIZE_BYTES) {
      response.status = 422;
      response.body = {
        success: false,
        msg: `Maximum upload size exceeded, size: ${
          request.headers.get(
            "content-length",
          )
        } bytes, maximum: ${MAX_SIZE_BYTES} bytes. `,
      };
    } else {
      const body = await request.body({ type: "form-data" });
      // The outPath folder has to exist
      const outPath = UPLOAD_DIR;
      const formData = await body.value.read({
        maxFileSize: MAX_SIZE_BYTES,
        outPath,
      });
      const requestId = crypto.randomUUID();
      const workflowName = transformUUIDToPattern(requestId);
      const time = new Date().toISOString().split(".")[0] + "Z";
      const fileName = formData.files[0].filename;
      const doLanguageId = typeof formData.fields.do_language_id === "boolean"
        ? formData.fields.do_language_id
        : false;
      const doSpeakerId = typeof formData.fields.do_speaker_id === "boolean"
        ? formData.fields.do_speaker_id
        : true;
      const doPunctuation = typeof formData.fields.do_punctuation === "boolean"
        ? formData.fields.do_punctuation
        : true;
      const filePath = Deno.cwd() + "/" + fileName;
      /*const extension = getFileExtension(filePath);
        const resultFileName = removeFileExtension(
            fileName,
            extension
            ).replace(outPath + "/", ""); */

      const resultsDir = RESULTS_DIR + "/" + workflowName;
      const resultLocation = resultsDir;
      console.log(resultsDir, resultLocation);

      db.prepare(`
                INSERT INTO workflows 
                (request_id, name, created_at_utc, status, location, result_location)
                VALUES (?, ?, ?, ?, ?, ?)
                `).run(requestId, workflowName, time, "queued", filePath, resultLocation);
           

      /* runNextflow(
        filePath,
        workflowName,
        resultsDir,
        doPunctuation,
        doSpeakerId,
        doLanguageId,
      ); */
      
      const command_args = [
        "run",
        "transcribe.nf",
        "-name",
        workflowName,
        "-with-weblog",
        `http://${APP_HOST}:${APP_PORT}/process/`,
        "--in",
        filePath,
        "--out_dir",
        resultsDir,
        "--do_punctuation",
        doPunctuation,
        "--do_speaker_id",
        doSpeakerId,
        "--do_language_id",
        doLanguageId,
      ];
      console.log(command_args, PIPELINE_DIR);
     /*  const logFile = await Deno.open("deno.log", {
        read: true,
        write: true,
        create: true,
      }); */
      const command = new Deno.Command(NEXTFLOW_PATH, {
        args: command_args,
        stdin: "piped",
        stdout: "piped",
        cwd: PIPELINE_DIR
      });
      const child = command.spawn();
      /* child.stdout.pipeTo(
        Deno.openSync("output.log", { write: true, create: true }).writable,
      );
      child.stdin.close(); */
      const status = await child.status;
      console.log(status, "status");

      response.status = 201;
      response.body = {
        success: true,
        requestId,
      };
      // response.redirect("/progress/" + requestId);
    }
  } else {
    response.status = 400;
    response.body = {
      success: false,
      msg: "No data included.",
    };
  }
};
// deno-lint-ignore no-explicit-any
const getUploadForm = ({ response }: { response: any }) => {
  response.headers.set("Content-Type", "text/html; charset=utf-8");
  response.body = `
    <h2>Upload a recording</h2>
    <form action="/upload" enctype="multipart/form-data" method="post" >
    <label for="do_speaker_id">Do speaker identification?</label>
    <input type="checkbox" id="do_speaker_id" name="do_speaker_id" value="yes" checked><br>
    <label for="do_language_id">Do language identification?</label>
    <input type="checkbox" id="do_language_id" name="do_language_id" value="yes" checked><br>
    <label for="do_punctuation">Add punctuation?</label>
  <input type="checkbox" id="do_punctuation" name="do_punctuation" value="yes" checked><br>
      <div>File: <input type="file" name="singleFile"/></div>
      <input type="submit" value="Upload" />
    </form>
  `;
};

const runNextflow = async (
  filePath: string,
  workflowName: string,
  resultsDir: string,
  doPunctuation: string,
  doSpeakerId: string,
  doLanguageId: string,
) => {
  const command_args = [
    NEXTFLOW_PATH,
    "run",
    "transcribe.nf",
    "-name",
    workflowName,
    "-with-weblog",
    `http://${APP_HOST}:${APP_PORT}/process/`,
    "--in",
    filePath,
    "--out_dir",
    resultsDir,
    "--do_punctuation",
    doPunctuation,
    "--do_speaker_id",
    doSpeakerId,
    "--do_language_id",
    doLanguageId,
  ];
  console.log(command_args, PIPELINE_DIR);
 /*  const logFile = await Deno.open("deno.log", {
    read: true,
    write: true,
    create: true,
  }); */
  const command = new Deno.Command(Deno.execPath(), {
    args: command_args,
    stdin: "piped",
    stdout: "piped",
  });
  const child = command.spawn();
  child.stdout.pipeTo(
    Deno.openSync("output.log", { write: true, create: true }).writable,
  );
  child.stdin.close();
  const status = await child.status;
  console.log(status);
};

function transformUUIDToPattern(uuid: string): string {
  // Step 1: Remove hyphens from the UUID
  let transformed = uuid.replace(/-/g, '');

  // Step 2: Ensure the first character is a lowercase letter
  if (!/^[a-z]/.test(transformed)) {
      transformed = 'a' + transformed.slice(1); // Replace the first character with 'a' if not a letter
  }

  // Step 3: Replace any non-alphanumeric character with an underscore (if any)
  transformed = transformed.replace(/[^a-z\d]/g, '_');

  // Step 4: Truncate or pad the string to match the length requirement (0-79 characters)
  if (transformed.length > 80) {
      transformed = transformed.slice(0, 80); // Truncate if too long
  }

  return transformed;
}

/* const increaseAscii = (acc:string, char: string) => {
  const ascii = char.charCodeAt(0);
  if (ascii <= 57) {
    return String.fromCharCode(ascii + 60);
  } else return char;
}; */

/* function getFileExtension(filename: string) {
  const ext = /^.+\.([^.]+)$/.exec(filename);
  return ext == null ? "" : ext[1];
}

function removeFileExtension(filePath: string, extension: string) {
  return filePath.slice(0, -1 * (extension.length + 1));
} */

export { getUploadForm, uploadFile};

// extensions: ['wav', 'mp3', 'ogg', 'mp2', 'm4a', 'mp4', 'flac', 'amr', 'mpg'], MAX_SIZE_BYTES: 400000000, maxFileSizeBytes: 200000000 }
