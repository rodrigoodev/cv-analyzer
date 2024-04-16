import { fastify } from "fastify";
import multipart from "@fastify/multipart";
import fs from "fs";
import util from "util";
import { pipeline } from "stream";
import { v4 as uuidv4 } from "uuid";
import PDFParser from "pdf2json";
import Utf8 from "utf8";

const pdfParser = new PDFParser();

const pump = util.promisify(pipeline);

const server = fastify();
server.register(multipart);

server.post("/upload-cv", async (request, response) => {
  const parts = request.files();
  const namefilehash = uuidv4();

  await writePdf(parts, namefilehash);
  writeJson(namefilehash);

  return { message: "files uploaded" };
});

const writePdf = async (parts, namefilehash) => {
  for await (const part of parts) {
    await pump(part.file, fs.createWriteStream(`./upload/${namefilehash}.pdf`));
  }
};

const writeJson = async (namefilehash) => {
  pdfParser.on("pdfParser_dataError", (errData) =>
    console.error(errData.parserError)
  );
  pdfParser.on("pdfParser_dataReady", async (pdfData) => {
    await fs.writeFile(
      `./upload/${namefilehash}.json`,
      JSON.stringify(pdfData),
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
      }
    );
    lendoJson(namefilehash);
  });

  pdfParser.loadPDF(`./upload/${namefilehash}.pdf`);
};

const lendoJson = (namefilehash) => {
  fs.readFile(`./upload/${namefilehash}.json`, "utf8", (error, data) => {
    if (error) {
      console.log(error);
      return;
    }
    extractData(JSON.parse(data));
  });
};

const extractData = (data) => {
  const totalPages = data.Pages.length;
  let textTotal = "";

  for (let i = 0; i < totalPages; i++) {
    const text = data.Pages[i].Texts;
    const textArray = text.map((item) => {
      return decodeURIComponent(item.R[0].T);
    });

    textTotal += textArray.join(" ");
  }

  console.log({
    textTotal,
  });
};

server.listen({
  port: 3333,
});
