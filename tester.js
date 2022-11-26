const fs = require('fs') ;
const path = require('path') ;
const { dir_itemList } = require('./common-fs');

main( ) ;

async function main( )
{
  const repoPath = path.resolve( `/xampp/htdocs/npm/sr_common` ) ;
  const gitPath = path.join( repoPath, '.git' );

  const { items, errmsg } = await dir_itemList( gitPath ) ;
  console.table( items ) ;
}
