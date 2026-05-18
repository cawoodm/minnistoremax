'use strict';

const {loadEnvFile} = require('node:process');
loadEnvFile();

const {format} = require('util');
const express = require('express');

const {Storage} = require('@google-cloud/storage');
const storage = new Storage();

const app = express();
app.set('view engine', 'pug');

app.use(express.json());

// Allow any domain CORS
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    // res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// A bucket is a container for objects (files).
const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);

// Display a form for uploading JSON
app.get('/', (req, res) => {
  res.render('form.pug');
});

// Pass the upload to Google Cloud Storage.
app.post('/upload/:blobId', (req, res, next) => {
  if (!req.body) {
    res.status(400).send('No data uploaded.');
    return;
  }

  // Create a new blob in the bucket and upload the file data.
  const blob = bucket.file(req.params.blobId);
  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: "application/json"
  });

  blobStream.on('error', err => {
    next(err);
  });

  blobStream.on('finish', () => {
    // The public URL can be used to directly access the file via HTTP.
    const localUrl = `/read/${blob.name}`;
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
    var html = `<ul>
    <li>Local: <a href="${localUrl}">${localUrl}</a>
    <li>Public: <a href="${publicUrl}">${publicUrl}</a>
    </ul>`;
    res.status(200).send(html);
  });

  blobStream.end(JSON.stringify(req.body));
});

// Read a blob from the bucket and return it as JSON.
app.get('/read/*', async (req, res, next) => {
  try {
    var path = req.path.substring(6);
    const blob = bucket.file(path);
    const [exists] = await blob.exists();
    if (!exists) {
      res.status(404).json({error: 'Blob not found'});
      return;
    }

    const [contents] = await blob.download();
    res.type('application/json').send(contents);
  } catch (err) {
    next(err);
  }
});

const PORT = parseInt(process.env.PORT) || 8080;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
  });
}

module.exports = app;
