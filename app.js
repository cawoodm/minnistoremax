'use strict';

const {loadEnvFile} = require('node:process');
try { loadEnvFile(); } catch { /* no .env in production — env comes from app.yaml */ }

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

// Encode a blob name as a URL path: percent-encode each segment, keep slashes.
const encodeBlobPath = (name) => name.split('/').map(encodeURIComponent).join('/');

const logAction = (action, blobId, size) => {
  const sizeStr = size === undefined ? '-' : `${size}B`;
  console.log(`[${action}] blobId=${blobId} size=${sizeStr}`);
};

// Pass the upload to Google Cloud Storage.
// An empty body deletes the blob instead of overwriting it.
app.post('/upload/*', async (req, res, next) => {
  const blobId = req.params[0];
  const isEmpty = !req.body || (typeof req.body === 'object' && Object.keys(req.body).length === 0);

  if (isEmpty) {
    try {
      const blob = bucket.file(blobId);
      await blob.delete({ignoreNotFound: true});
      logAction('delete', blobId);
      res.status(204).send("Empty POST, blob deleted");
    } catch (err) {
      next(err);
    }
    return;
  }

  // Create a new blob in the bucket and upload the file data.
  const blob = bucket.file(blobId);
  const payload = JSON.stringify(req.body);
  const payloadSize = Buffer.byteLength(payload);
  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: "application/json"
  });

  blobStream.on('error', err => {
    next(err);
  });

  blobStream.on('finish', () => {
    logAction('upload', blobId, payloadSize);
    // The public URL can be used to directly access the file via HTTP.
    const encodedName = encodeBlobPath(blob.name);
    const localUrl = `/read/${encodedName}`;
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodedName}`;
    var html = `<ul>
    <li>Local: <a href="${localUrl}">${localUrl}</a>
    <li>Public: <a href="${publicUrl}">${publicUrl}</a>
    </ul>`;
    res.status(200).send(html);
  });

  blobStream.end(payload);
});

// Read a blob from the bucket and return it as JSON.
app.get('/read/*', async (req, res, next) => {
  const blobId = req.params[0];
  try {
    const blob = bucket.file(blobId);
    const [exists] = await blob.exists();
    if (!exists) {
      res.status(404).json({error: 'Blob not found'});
      return;
    }

    const [contents] = await blob.download();
    logAction('read', blobId, contents.length);
    res.type('application/json').send(contents);
  } catch (err) {
    next(err);
  }
});

// Delete a blob from the bucket.
app.delete('/delete/*', async (req, res, next) => {
  const blobId = req.params[0];
  try {
    const blob = bucket.file(blobId);
    let size;
    try {
      const [metadata] = await blob.getMetadata();
      size = Number(metadata.size);
    } catch (err) {
      if (err.code === 404) {
        res.status(404).json({error: 'Blob not found'});
        return;
      }
      throw err;
    }
    await blob.delete();
    logAction('delete', blobId, size);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const PORT = parseInt(process.env.PORT) || 8080;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MinniStoreMax ready on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to quit.');
  });
}

module.exports = app;
