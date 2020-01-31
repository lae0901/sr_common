// /js/common-fs.js

const path = require('path') ;
const fs = require('fs');
const {string_clip, string_ensureQuoted, string_replaceAll, string_replaceAt} = require('./string-funcs');

// ---------------------------- fs_ensureDirExists --------------------------
// options: { deep: true, mask: 0777 }
// deep: ensure deep directory exists. create dir of dir.
function fs_ensureDirExists(dirPath, mask)
{
  const promise = new Promise((resolve, reject) =>
  {
    mask = mask || 0777 ;
    fs.mkdir(dirPath, mask, async (err) =>
    {
      let errmsg = '' ;
      let action = '' ;
      if (err)
      {
        if (err.code == 'EEXIST')
          errmsg = '' ;
        else if ( err.code == 'ENOENT')
        {
          const parentPath = path.dirname(dirPath) ;
          const rv = await fs_ensureDirExists(parentPath, mask ) ;
          errmsg = rv.errmsg ;
          if ( !errmsg )
          {
            const rv = await fs_ensureDirExists(dirPath, mask ) ;
            errmsg = rv.errmsg ;
            action = rv.action ;
          }
        }
        else
          errmsg = err.message ;
      }
      else
      {
        action = `directory ${dirPath} created`;
      }
      resolve({errmsg, action});
    });
  });
  return promise;
}

// ---------------------- fs_readTextFilx --------------------------------
function fs_readTextFilx(filePath)
{
  const promise = new Promise((resolve, reject) =>
  {
    const text = fs.readFileSync(filePath, 'utf-8');
    resolve(text);
  });
  return promise;
}

// ---------------------- fs_readTextFile --------------------------------
function fs_readTextFile(filePath)
{
  const promise = new Promise((resolve, reject) =>
  {
    let errmsg = '' ;
    let text = '' ;
    fs.readFile(filePath, 'utf-8', (err, data) =>
    {
      if ( err )
        errmsg = err.message ;
      else
        text = data;
      resolve({text, errmsg});
    });
  });
  return promise ;
}

// ---------------------------- fs_readTextFile_ifExists --------------------------
function fs_readTextFile_ifExists( filePath )
{
  const promise = new Promise((resolve, reject) =>
  {
    fs.exists(filePath, async (exists) =>
    {
      if ( !exists )
        resolve('') ;
      else
      {
        const text = await fs_readTextFilx(filePath);
        resolve(text);
      }
    });
  });
  return promise;
}

// ---------------------- fs_writeTextFile --------------------------------
// textLines: array of text lines to write to text file.
function fs_writeTextFile(filePath, textLines )
{
  const promise = new Promise((resolve, reject) =>
  {
    let errmsg = '' ;
    const textStr = textLines.join('\n') ;

    fs.writeFile(filePath, textStr, (err) =>
    {
      if (err)
        errmsg = `${err.message} filePath:${filePath}` ;
      resolve({errmsg});
    })
  });
  return promise;
}

module.exports = { fs_ensureDirExists, fs_readTextFile, fs_readTextFilx,
        fs_readTextFile_ifExists, fs_writeTextFile,
  string_clip, string_ensureQuoted, string_replaceAll, string_replaceAt
    } ;
