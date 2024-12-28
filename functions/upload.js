const { google } = require("googleapis");
const multiparty = require("multiparty");
const fs = require("fs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // パース処理
  const form = new multiparty.Form();
  const files = await new Promise((resolve, reject) => {
    form.parse(event, (err, fields, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.KEY_FILE_CONTENT),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  const drive = google.drive({ version: "v3", auth });

  try {
    const uploadPromises = Object.values(files).flat().map((file) => {
      const fileMetadata = { name: file.originalFilename };
      const media = {
        mimeType: file.headers["content-type"],
        body: fs.createReadStream(file.path),
      };
      return drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id",
      });
    });

    await Promise.all(uploadPromises);
    return { statusCode: 200, body: "Files uploaded successfully!" };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Error uploading files." };
  }
};
