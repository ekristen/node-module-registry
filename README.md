# node module registry

This is an open source implementation of the server side registry for the npm client for publishing and installing node.js modules. This was reverse engineered by intercepting calls from the `npm` client. 

It was reverse engineered using ONLY the `npm` client and `npm --verbose` output, no other source code was consulted. 

This project was not designed to replace the public registry, but allow for people to run their own local or private registries for their own namespaces for free. There are some caveats. (see below)

This project is over a year in the making, it has been used extensively, and now has been updated, documented and moved from native http server to use restify.

## Usage

### Running

The easiest and preferred method of deployment is via docker, instructions are below. 

### Access and Authentication

Authentication is made possible by using GitHub, however this is **not** designed to be exposed directly on the internet. It is **highly** recommended that you put up a **HTTPS** proxy in front of this service.

### NPM Client Configuration

When using GitHub authentication you will need to add two lines to your `.npmrc` config file. The first line is tell the npm client what registry to talk to for the `namespace`, the second line is to tell the npm client the authentication token to send to the registry.

```
@namespace:registry=https://nmr.private.io/
//nmr.private.io/:_authToken=GITHUB_PERSONAL_ACCESS_TOKEN
```

If you are using the `none` authentication you can **omit** the second line.

#### Example when using non-standard port

```
@namespace:registry=http://nmr.local:3000/
//nmr.local:3000/:_authToken=GITHUB_PERSONAL_ACCESS_TOKEN
```

## Capabilities

* Redirecting Global Namespaced packages to the public registry (**for installs only**)
* Namespaced packages (e.g. @ekristen/github-cache)
* Authentication against GitHub

## Roadmap

* Proxy connections to public registry and cache retrieved files
* Implement `libkv` to support more metadata storage backends

## Namespaces

There are two types of namespaces, non-namespaced (aka global) and namespaced. A namespace is the `@` character plus a string. On the public registry this is a registered username.

### Global

If you configure your local npm client (eg `npm config set registry http://nmr-host`) when you attempt to install a global namespaced package, it will redirect your request to the public registry. Support for proxing publish and othe commands are not yet supported.

### User

User namespaces were introduced in the npm client. It allows you to set the `name` in the package.json to `@namespace/package-name`. On the public registry, you must own the namespace. With `node-package-registry` the authentication method determines how the namespace controls work.

## Authentication

* none
* github

### Type: none

Basically this opens up every action to anyone, should only be used for development purposes or perhaps local usage only. It is **NOT** secure.

### Type: github

When using the `GitHub` authentication method, the registry determines permissions based on what permissions your GitHub user has against a GitHub repository. The authentication method uses the `repository` field in the package.json file to determine the GitHub repository, it then talks to the GitHub API using your user's GitHub authentication token (hence the reason for the Personal Access Token). If your user has read permissions you will be able to pull (aka install access). If your user has write or admin on the GitHub repository you will be able to publish, tag, and of course pull/install.

Your package's namespace **must** match the associated GitHub repositories owner. For example if your package is `node-github-cache` and the GitHub repository is `ekristen/node-github-cache`, the name of the package can differ, but the namespace cannot. So in your `package.json`, the `name` field would need to look something like `@ekristen/github-cache`, you will also have to set the `repository` field to `ekristen/node-github-cache`, again the namespace must match.

#### Caveats

The personal access token require `repo`, `read:org` and `user:email` scopes. The reason for the `repo` is that without read/write to all repositories (including private ones) there is no way to determine what level of permission the token actually has. The source is 100% open source, I encourage you to review it.

## Storage

### Metadata Storage

All metadata about packages is stored by default using `leveldb`. If you are using docker, you'll want to do a host volume mount to persist the leveldb data through reboots and upgrades.

### Module Storage

* local (default)
* s3

#### Type: local

This is the default file storage method, and requires a valid path on the local file system, all modules are stored in path based on namespace paths.

#### Type: s3

This requires valid s3 configuration information, like the local filesystem all modules are stored in s3 based on the namespace of the package. With S3 you get the additional option to redirect the `npm` client to retrieve the npm module directly from S3 instead, this takes the load off of the node package registry from serving up the file.

## Configuration

The configuration is handled by the `rc` module. Simply place the appropriately named `rc` configuration file in right path or use environment variables to set your settings.

### Options

* **allow_previous_version** - allow's you to publish over a version that was already published. **NOT RECOMMENDED** (default: false)

### Default Configuration

```javascript
{
  host: '0.0.0.0',
  port: 3000,
  auth: {
    type: 'none',
    github: {
      host: 'github.com',
      cache: {
        path: './data/github-cache'
      }
    }
  },
  logger: {
    level: 'debug'
  },
  datastore: {
    type: 'level',
    level: {
      path: './data/db'
    }
  },
  storage: {
    type: 'local',
    local: {
      path: './data/storage'
    },
    s3: {
      accessKeyId: null,
      secretAccessKey: null,
      region: null,
      bucket: null,
      prefix: null,
      redirect: false,
      expires: 60
    }
  },
  allow_previous_version: false
}
```

## Docker

```bash
docker run -d \
  --name="nmr" \
  -p 3000:3000 \
  -v /data/nmr/db:/opt/data/db \
  -v /data/nmr/github-cache:/opt/data/github-cache \
  -v /data/nmr/storage:/opt/data/storage \
  ekristen/node-module-registry
```

## Error Codes

These are possible error codes that will be returned by the node package registry to the `npm` client

### Download Errors Codes

1. 404 - Not Found -- Package is not known to the registry
2. 401 - Unauthorized -- You need to authenticate properly
3. 409 - Conflict - (version already exists, unable to change)
4. 410 - Gone - old version that existed, but has since been deleted
5. 500 - Internal Error - something happened that should have not happened


## Caveats

* Designed for private use by organizations to run their own private node package registry that is compatible with NPM.
* Using GitHub for authentication requires `repo` scope on personal access tokens
* When using GitHub for authentication, the registry trusts the data being published in the package.json. Generally speaking each module should be tied to one GitHub repository, however this is **not** enforced. The repository field is used to determine permissions.

