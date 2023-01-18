# sr_common - common node functions

## import
* const { fs_readTextFile } = require('sr_common');

## date methods
* date_currentISO( )
* date_toISO() 

## file methods
* exists = await fs_exists(filePath) 
* const {err,files } = await fs_readDir( dirPath )
* const {text} = await fs_readTextFile('.' + req.path);
* const {base64} = await fs_readBase64( filePath );
* const { items, errmsg } = await dir_itemList( gitPath ) ;

## string methods
* string_head( str, lx )
* {part1, part2} = str_headSplit( str, lx )
* str_substrLenient( str, bx, lx )

## publish instructions
* increment version number in package.json
* make sure new functions are exported from common-fs.js
* git add, commit, push to repo
* npm publish
* npm update in projects which use this package

