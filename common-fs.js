// /js/common-fs.js

const path = require('path') ;
const fs = require('fs');
const btoa = require('btoa') ;
const {string_clip, string_ensureQuoted, string_head, str_headSplit, 
        string_replaceAll, 
        string_replaceAt, string_substrLenient, str_substrLenient } = require('./string-funcs');
const { date_toISO, date_currentISO } = require('./core-funcs');

// ------------------------------- dir_itemList --------------------------------
// return array containing list of items in a folder. Where each item is an
// object { itemName, isDir, isFile, size, modDate, createDate }
/**
 * 
 * @param {string} dirPath directory path 
 * @returns [{itemName, isDir, isFile, size, createDate}]
 */
function dir_itemList( dirPath )
{
  const promise = new Promise((resolve, reject) =>
  {
   const items = [] ;
   let errmsg ;

   fs.readdir( dirPath, async (err, files) =>
   {
     if ( err )
     {
       errmsg = err.error ;
     }
     else if (files)
     {
       for( const file of files )
       {
         const fullPath = path.join( dirPath, file) ;
         const {isDir, isFile, size, createDate } = await fs_stat(fullPath ) ;
         const item = { itemName:file, fullPath, isDir, isFile, size, createDate };
         items.push(item) ;
       };
     }
     resolve({errmsg, items});
   });
 }) ;
 return promise ;

   // https://stackoverflow.com/questions/37576685/using-async-await-with-a-foreach-loop


   // for await (const results of array) {
   //   await longRunningTask()
   // }
   // console.log('I will wait')
}

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

// ------------------------------ fs_exists ------------------------------
function fs_exists( filePath )
{
  const promise = new Promise((resolve, reject) =>
  {
    fs.exists(filePath, (exists) =>
    {
      resolve(exists);
    });
  });
  return promise;
}

// ---------------------- fs_readBase64 --------------------------------
function fs_readBase64(filePath)
{
  const promise = new Promise((resolve, reject) =>
  {
    let errmsg = '';
    let base64 = '';
    fs.readFile(filePath, (err, data) =>
    {
      if (err)
        errmsg = err.message;
      else
        base64 = btoa(data);
      resolve({ base64, errmsg });
    });
  });
  return promise;
}

// ---------------------- fs_readDir --------------------------------
function fs_readDir( dirPath)
{
  const promise = new Promise((resolve, reject) =>
  {
    fs.readdir(dirPath, (err, files) =>
    {
      resolve({err,files});
    });    
  }) ;
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

// ------------------------------- fs_stat --------------------------------
/**
 * 
 * @param {string} path path of the director item 
 * @returns { size, isDir, isFile, createDate, errmsg }
 */
function fs_stat(path)
{
  const promise = new Promise((resolve, reject) =>
  {
    let errmsg = '';
    let size = 0;
    let text = '', isDir = false, isFile = false, createDate = '';
    fs.stat(path, (err, stats) =>
    {
      if (err)
        errmsg = err.message;
      else
      {
        size = stats.size;
        isDir = stats.isDirectory();
        createDate = stats.birthtime.toISOString().substr(0, 10);
        isFile = stats.isFile();
      }
      resolve({ size, isDir, isFile, createDate, errmsg });
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

module.exports = { date_currentISO, date_toISO,
        dir_itemList,
        fs_ensureDirExists, fs_exists, fs_readBase64, fs_readDir, 
        fs_readTextFile, fs_readTextFilx,
        fs_readTextFile_ifExists, fs_stat, fs_writeTextFile,
        string_clip, string_ensureQuoted, string_head, str_headSplit,
        string_replaceAll, 
        string_replaceAt, string_substrLenient, str_substrLenient
    } ;
