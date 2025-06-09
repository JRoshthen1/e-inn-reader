# E-inn

[Pre-release](https://jroshthen1.github.io/e-inn-reader/)

E-inn is a basic EPUB reader supporting remote API imports and local file uploads. Books are stored in IndexedDB; settings and reading progress are retained via localStorage. Built as a single-page application with Vue.js, Vue Router, and epub.js for rendering. No accounts, sync, or advanced features, serves static assets. Minimal UI, lightweight, customizable interface.

## Running 

Run development server with: 
```
docker-compose up dev
```

Run clean build with:
```
docker-compose up build
```
 
### API reasoning: 

If you have a userbase, you can use a centralized database for your content and the e-inn-reader as client. You only need to set some environment variables in the .env and build this project

``` 
VITE_REMOTE_API='true'
VITE_API_URL=http://localhost/api # your server
```

# Api server requirements

### `GET` `/api/epub-library`
Returns: `JSON`
```json
{
  "epubs": [
    {
      "id": "id",
      "filename": "book-title.epub",
      "path": "/storage/path",
      "size": 4521120
    }
  ],
  "total": 15
}
```

#### `GET` `/api/epub/{id}/{filename}`
Parameters:
  - `id`: `string`
  - `filename`: `string`


## Return: Binary EPUB file with Content-Type: application/epub+zip
```
OPTIONS /api/epub-library
OPTIONS /api/epub/{id}/{filename}
Returns: Empty response with CORS headers
```
