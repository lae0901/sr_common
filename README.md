# sr_common - common node functions


## file methods
* exists = await fs_exists(filePath) 
* const {err,files } = await fs_readDir( dirPath )

## publish instructions
* increment version number in package.json
* npm run build
* git add, commit, push to repo
* npm publish
* npm update in projects which use this package

