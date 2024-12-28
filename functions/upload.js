const { google } = require("googleapis");
const multiparty = require("multiparty");
const fs = require("fs");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*", // CORS設定
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "OK",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: "Method Not Allowed",
    };
  }

  try {
    // ファイルのパース処理
    const form = new multiparty.Form();
    const parsedData = await new Promise((resolve, reject) => {
      form.parse(event, (err, fields, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.KEY_FILE_CONTENT), // 環境変数からサービスアカウントキーを取得
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });
    const drive = google.drive({ version: "v3", auth });

    // ファイルをGoogle Driveにアップロード
    const uploadPromises = Object.values(parsedData.files).flat().map((file) => {
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

    return {
      statusCode: 200,
      headers,
      body: "Files uploaded successfully!",
    };
  } catch (err) {
    console.error("Error processing files:", err);
    return {
      statusCode: 500,
      headers,
      body: "Error uploading files.",
    };
  }
};
