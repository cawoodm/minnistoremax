$env:GOOGLE_CLOUD_PROJECT = "site-one-404308"
$env:GCLOUD_STORAGE_BUCKET = "site-one-404308.appspot.com"
npm start

# Set ACL to public read
gcloud storage buckets update --predefined-default-object-acl=publicRead gs://site-one-404308.appspot.com

# Setup ADC - Application Default Credentials
gcloud auth application-default login

# Deploy
gcloud app deploy

# View app
gcloud app browse

# View Bucket
https://console.cloud.google.com/storage/browser/site-one-404308.appspot.com