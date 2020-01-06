const path = require('path');
const fs = require('fs');
const {rxp} = require('./regex_core') ;
const { sql_whereClauseBuilder, sql_argumentMarkerBuilder } = require('./core-funcs');
const { string_ensureQuoted } = require('./string-funcs');

// --------------------------- dataDefn_parse ---------------------------
// parse dataDefn string.  VARCHAR(25), DECIMAL(7,2), TIMESTAMP, INT, ...
// return { errmsg, dataType, lgth, prec }
function dataDefn_parse( dataDefn )
{
  let errmsg = '' ;
  dataDefn = dataDefn.toUpperCase( ).trim( ) ;

  // regexp that parses:   VARCHAR(25), DECIMAL(7,2), TIMESTAMP, INT, ...
  const pat = rxp.beginString +
    rxp.beginCapture + rxp.oneMoreAlpha + rxp.endCapture +
    rxp.beginCapture + rxp.escape('(') + rxp.zeroMoreWhitespace +
    rxp.beginCapture + rxp.oneMoreDigits + rxp.endCaptureOneMore +
    rxp.beginCapture +
    rxp.zeroMoreWhitespace + ',' + rxp.zeroMoreWhitespace +
    rxp.beginCapture + rxp.oneMoreDigits + rxp.endCapture +
    rxp.endCaptureZeroOne +
    rxp.zeroMoreWhitespace + rxp.escape(')') + rxp.endCaptureZeroOne;
  const re = new RegExp(pat);

  let [, dataType, , lgth, , prec] = re.exec(dataDefn);
  
  // check for errors.
  if (( dataType == 'VARCHAR') || ( dataType == 'CHAR'))
  {
    if ( !lgth )
      errmsg = 'dataDefn length missing.' ;
  }
  else if ((dataType == 'DECIMAL') || (dataType == 'NUMERIC'))
  {
    if (!lgth)
      errmsg = 'dataDefn length missing.';
    prec = prec || '0' ;
  }

  return [errmsg, dataType, lgth, prec ] ;
}

// --------------------------- dataDefn_toString ---------------------------
// build dataDefn string from component parts.
function dataDefn_toString(dataType, lgth, prec)
{
  let dataDefn = dataType.toUpperCase();
  if (dataDefn == 'DECIMAL')
    dataDefn += `(${lgth},${prec})`;
  else if ((dataDefn == 'CHAR') || (dataDefn == 'VARCHAR'))
    dataDefn += `(${lgth})`;
  return dataDefn;
}

// ------------------------- mysql_addColumn -----------------------------
// options:{ lgth, prec, notNull, def }
// dataType: CHAR VARCHAR DECIMAL INT DATE TIME TIMESTAMP
const mysql_addColumn = async (db, tableName, columnName, dataType, options) =>
{
  dataType = dataType || 'char' ;
  dataType = dataType.toUpperCase( ) ;
  options = options || {} ;
  let {lgth, prec, notNull, def, dataDefn, is_nullable, character_set_name } = options ;
  lgth = lgth || 10 ;
  prec = prec || '0' ;
  dataDefn = dataDefn || '' ;
  let errmsg = '' ;

  // column is nullable.
  if ( typeof is_nullable != 'undefined')
  {
    if ( is_nullable == 'Y' )
      notNull = false ;
    else if ( is_nullable == 'N' )
      notNull = true ;
  }

  // dataDefn:   varchar(50), int, date, decimal(5,0)
  // parse to dataType, length and precision.
  if ( dataDefn )
  {
    [errmsg, dataType, lgth, prec] = dataDefn_parse(dataDefn) ;
  }
  
  const promise = new Promise((resolve, reject) => 
  {
    let seg = `add column ${columnName} ${dataDefn_toString(dataType,lgth,prec)}`;

    if ( notNull )
      seg += ` NOT NULL `;
    
    if ( def )
    {
      if ( ['CHAR','VARCHAR','TEXT','MEDIUMTEXT','LONGTEXT'].indexOf(dataType) >= 0)
        def = string_ensureQuoted(def, `'`) ;
      seg += ` DEFAULT ${def} `;
    }

    // character set
    if (character_set_name)
    {
      if (['CHAR', 'VARCHAR', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT'].indexOf(dataType) >= 0)
      {
        seg += ` CHARACTER SET ${character_set_name}`;
      }
    }
    
    let sql = `ALTER TABLE ${tableName} ${seg} ; ` ;
    console.log('addColumn: ' + sql ) ;
    const data = [];

    db.query(sql, data, (err, results, fields) =>
    {
      if (err)
        reject(err);
      resolve(results);
    });
  });

  return promise;
}

// ------------------------- mysql_alterColumn -----------------------------
// options:{ columnName, dataDefn, is_nullable, def, character_set_name }
// dataType: CHAR VARCHAR DECIMAL INT DATE TIME TIMESTAMP
const mysql_alterColumn = async (db, tableName, curColName, options) =>
{
  options = options || {};
  let { columnName, def, dataDefn, is_nullable, character_set_name } = options;
  dataDefn = dataDefn || '';
  let errmsg = '', dataType, lgth, prec ;
  let results = {} ;

  // column is nullable.
  let notNull = false ;
  if (typeof is_nullable != 'undefined')
  {
    if (is_nullable == 'Y')
      notNull = false;
    else if (is_nullable == 'N')
      notNull = true;
  }

  // dataDefn:   varchar(50), int, date, decimal(5,0)
  // parse to dataType, length and precision.
  [errmsg, dataType, lgth, prec] = dataDefn_parse(dataDefn);

  // rename column name
  if (( columnName ) && ( columnName != curColName ) && ( 1 == 2))
  {
    const sql = `ALTER TABLE ${tableName} 
                  RENAME COLUMN ${curColName} 
                  TO ${columnName}` ;
    results = await mysql_runQuery(db, sql ) ;
  }

  else 
  {
    let sql = `ALTER TABLE ${tableName} 
                  CHANGE ${curColName} ${columnName}
                  ${dataDefn_toString(dataType,lgth,prec)} `;

    // character set
    if (['CHAR', 'VARCHAR', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT'].indexOf(dataType) >= 0)
    {
      if ( character_set_name )
      {
        sql += ` CHARACTER SET ${character_set_name}`;
      }
    }

    if (notNull)
      sql += ` NOT NULL `;

    if (['MEDIUMTEXT', 'TEXT', 'LONGTEXT'].indexOf(dataType) == -1)
    {
      if (def)
      {
        if (['CHAR', 'VARCHAR', 'TEXT', 'LONGTEXT'].indexOf(dataType) >= 0)
          def = string_ensureQuoted(def, `'`);
        sql += ` DEFAULT ${def} `;
      }
    }
    
    results = await mysql_runQuery(db, sql);
  }

  return {results, errmsg } ;
}

// ---------------------------- mysql_callFunc --------------------------------
// call the sql function.  return the return value.
// funcName: name of function to call.
// args: object contains argument values.
// returns: { rtnval, errmsg }
const mysql_callFunc = async (db, funcName, args) =>
{
  const promise = new Promise((resolve, reject) =>
  {
    const { argData, argMarker } = sql_argumentMarkerBuilder(args) ;
    let sql = `select ${funcName}(${argMarker})`;

    db.query(sql, argData, (err, results, fields) =>
    {
      let errmsg = '';
      let rtnval = null;
      if (err)
      {
        errmsg = err.message;
      }
      else if (Array.isArray(results) && (results.length > 0))
      {
        const row = results[0];
        rtnval = Object.values(row)[0] ;
      }
      else
      {
        data = results;
      }

      resolve({ errmsg, rtnval });
    });
  });

  return promise;
}

// ---------------------------- mysql_callProc --------------------------------
// selectColumns - array of column names to be selected
// whereKeys : {key1:xxx, key2:yyy }
// returns selected rows as array of objects. 
const mysql_callProc = async (db, procName, whereParm ) =>
{
  const promise = new Promise((resolve, reject) =>
  {
    const whereParmText = JSON.stringify(whereParm) ;
    let sql = `call ${procName}(?)`;

    const data = [whereParmText];
    db.query(sql, data, (err, results, fields) =>
    {
      let errmsg = '';
      let data = null;
      if (err)
      {
        errmsg = err.message ;
      }
      else if (Array.isArray(results) && (results.length > 0))
      {
        const fsItem = results[0];
        if ((fsItem.constructor.name == 'RowDataPacket') || (fsItem.constructor.name == 'TextRow'))
          data = results ;
        else
          data = fsItem ;
      }
      else
      {
        data = results ;
      }

      resolve({errmsg, data});
    });
  });

  return promise;
}

// ---------------------------- mysql_callSelectProc --------------------------------
// selectColumns - array of column names to be selected
// whereKeys : {key1:xxx, key2:yyy }
// returns selected rows as array of objects. 
const mysql_callSelectProc = async (db, procName, whereParm) =>
{
  const promise = new Promise((resolve, reject) =>
  {
    const whereParmText = JSON.stringify(whereParm);
    let sql = `call ${procName}(?)`;

    const data = [whereParmText];
    db.query(sql, data, (err, results, fields) =>
    {
      let errmsg = '';
      let set1 = null;
      if (err)
      {
        errmsg = err.message;
      }
      else if (Array.isArray(results) && (results.length > 0))
      {
        const fsItem = results[0];
        if ((fsItem.constructor.name == 'RowDataPacket') || (fsItem.constructor.name == 'TextRow'))
          set1 = results;
        else
          set1 = fsItem;
      }
      else
      {
        set1 = results;
      }

      resolve({ errmsg, set1 });
    });
  });

  return promise;
}

// ------------------------------- mysql_currentDatabaseName --------------------------
async function mysql_currentDatabaseName(db)
{
  const rv = await mysql_callFunc(db, 'database', {});
  return rv.rtnval ;
}

// ------------------------------- mysql_runQuery --------------------------
function mysql_runQuery( db, sql, data )
{
  const promise = new Promise((resolve, reject) =>
  {
    data = data || {} ;
    db.query(sql, data, (err, results, fields) =>
    {
      if (err)
        reject(err);
      resolve(results);
    });
  });
  return promise ;
}

// ------------------------- mysql_dropObjectIfExists -----------------------------
const mysql_dropObjectIfExists = async (db, objName, objType) =>
{
  const promise = new Promise((resolve, reject) => 
  {
    const stmtText = `DROP ${objType} IF EXISTS ${objName}`;
    const data = [];
    db.query(stmtText, data, (err, results, fields) =>
    {
      if (err)
        reject(err);
      resolve(results);
    });
  });

  return promise;
}

// ------------------------- mysql_createObject -----------------------------
const mysql_createObject = async (db, object_id, objName, objType, codeText ) =>
{
  const promise = new Promise( async (resolve, reject) => 
  {
    await mysql_dropObjectIfExists(db, objName, objType ) ;
    const data = [];
    db.query( codeText, data, async (err, results, fields) =>
    {
      let compMessage = '' ;
      let errmsg = '' ;
      if (err)
      {
        errmsg = err.sqlMessage ;
        if (!errmsg)
          errmsg = err.message ;
      }
      else
      {
        const databaseName = await mysql_currentDatabaseName(db) ;
        compMessage = `${objType} ${objName} created in database ${databaseName}`;
      }
      resolve({ errmsg, compMessage });
    });
  });

  return promise;
}

// ------------------------- mysql_createTable -----------------------------
const mysql_createTable = async (db, tableName, idColumnName, idColumnDataType ) =>
{
  idColumnName = idColumnName || 'ID' ;
  idColumnDataType = idColumnDataType || 'int' ;
  const promise = new Promise((resolve, reject) => 
  {
    let sql = `CREATE TABLE ${tableName} ( 
                ${idColumnName} ${idColumnDataType} AUTO_INCREMENT,
                PRIMARY KEY ( ${idColumnName} ));` ;
    const data = [ ] ;

    db.query(sql, data, (err, results, fields) =>
    {
      if (err)
        reject(err);
      resolve(results);
    });
  });

  return promise;
}

// ------------------------- mysql_databases_select -----------------------------
const mysql_databases_select = async (db) =>
{
  const promise = new Promise((resolve, reject) => 
  {
    let sql = `SELECT schema_name
               FROM information_schema.schemata;`;
    db.query(sql, (err, results, fields) =>
    {
      if (err)
        reject(err);
      resolve(results);
    });
  });

  return promise;
}

// ------------------------- mysql_databaseTables_select --------------------------
const mysql_databaseTables_select = async (db, database ) =>
{
  const promise = new Promise((resolve, reject) => 
  {
    let sql = `SELECT a.table_name,
                    ( select count(*) from information_schema.columns b
                      where  a.table_schema = b.table_schema
                             and a.table_name = b.table_name ) column_count
               FROM information_schema.tables a
               where a.table_schema = ? 
               order by lower(a.table_name) ;`;
    const data = [database] ;
    db.query(sql, data, (err, results, fields) =>
    {
      if (err)
        reject(err);
      resolve(results);
    });
  });

  return promise;
}

// ---------------------------- mysql_deleteRows --------------------------------
// whereKeys : {key1:xxx, key2:yyy }
// returns count of deleted rows.
const mysql_deleteRows = async (db, tableName, whereKeys) =>
{
  const promise = new Promise((resolve, reject) =>
  {
    // build select sql statement.

    const alias = 'a' ;
    const { whereClause, whereData } = sql_whereClauseBuilder(whereKeys, alias );

    const sql = `DELETE a FROM ${tableName} a 
                ${whereClause} `;

    // run the query to select the row.
    const data = [...whereData];
    db.query(sql, data, (err, results, fields) =>
    {
      if (err)
        reject(err);
      else
        resolve(results);
    });
  });
  return promise;
}

// ------------------------- mysql_dropColumn -----------------------------
const mysql_dropColumn = async (db, tableName, columnName ) =>
{
  const promise = new Promise((resolve, reject) => 
  {
    let sql = `alter table ${tableName} drop column ${columnName} ;`;
    db.query(sql, (err, results, fields) =>
    {
      if (err)
        reject(err);
      resolve(results);
    });
  });

  return promise;
}

// ------------------------- mysql_dropTable -----------------------------
const mysql_dropTable = async (db, tableName) =>
{
  const promise = new Promise((resolve, reject) => 
  {
    let sql = `drop TABLE ${tableName} ;` ;
    db.query(sql, (err, results, fields) =>
    {
      if (err)
        reject(err);
      resolve(results);
    });
  });

  return promise;
}

// ----------------------- substituteMarkerString_build ---------------------------
// build string containing the specified number of substitute value marker symbols.
//  ?, ?, ? , ....
function substituteMarkerString_build( numMarkers )
{
  let markerText = '' ;
  for (let ix = 0; ix < numMarkers; ++ix)
  {
    if (ix > 0)
      markerText += ', ';
    markerText += '?';
  }

  return markerText ;
}

// ------------------------------ mysql_insertRow --------------------------
const mysql_insertRow = async (db, tableName, rowData ) =>
{
  // string containing the names of the insert column names, separated with comma.
  const columnNamesText = '( ' + Object.keys(rowData).join(', ') + ') ' ;

  // string containing ? for each column being inserted into the row.
  const numColumns = Object.keys(rowData).length ;
  let columnValueMarkerText = ' values(' 
              + substituteMarkerString_build( numColumns ) + ')' ;

  const promise = new Promise((resolve, reject) => 
  {
    let sql = `insert into ${tableName} ${columnNamesText} 
                ${columnValueMarkerText} ;` ;
    const data = Object.values(rowData) ;
    db.query(sql, data, async (err, results, fields) =>
    {
      let insert_id = 0 ;
      if (err)
        reject(err);
      if ( !results )
      {
        console.log('results missing. ' + sql) ;
      }
      else
      {
        insert_id = results.insertId;
      }
    resolve( insert_id );
    });
  });

  return promise;
}

// ------------------------------ mysql_lastInsertId --------------------------
const mysql_lastInsertId = async (db) =>
{
  let insert_id = 0 ;
  const promise = new Promise((resolve, reject) => 
  {
    let sql = `SELECT LAST_INSERT_ID();` ;
    db.query(sql, (err, results, fields) =>
    {
      if (err)
        reject(err);
      if ( results.length == 1 )
      {
        const row = results[0] ;
        insert_id = row['LAST_INSERT_ID()'];
      }
      resolve(insert_id);
    });
  });

  return promise;
}

// ---------------------------- mysql_runFunction --------------------------------
// functionName, inputParms:{parm1, parm2, parm3 }
const mysql_runFunction = async (db, functionName, inputParms) =>
{
  const promise = new Promise((resolve, reject) =>
  {
    // add ? for each input parm.
    inputParms = inputParms || {} ;
    let parmMarkerText = '' ;
    let parmData = [] ;
    for( key of Object.keys( inputParms ))
    {
      const vlu = inputParms[key] ;
      if ( vlu )
      {
        if ( parmMarkerText)
          parmMarkerText += ',' ;
        parmMarkerText += '?' ;
        parmData.push(vlu) ;
      }
    }

    let sql = `select ${functionName}(${parmMarkerText})`;
    db.query(sql, parmData, (err, results, fields) =>
    {
      let errmsg = '';
      let set1 = null;
      if (err)
      {
        errmsg = err.message;
      }
      else if (Array.isArray(results) && (results.length > 0))
      {
        const fsItem = results[0];
        if ((fsItem.constructor.name == 'RowDataPacket') || (fsItem.constructor.name == 'TextRow'))
          set1 = results;
        else
          set1 = fsItem;
      }
      else
      {
        set1 = results;
      }

      resolve({ errmsg, set1 });
    });
  });

  return promise;
}

// ------------------------- mysql_runSelect --------------------------
// run sql select stmt. return result set rows, errmsg, ...
// returns: { set1: [], errmsg:'' }
const mysql_runSelect = async (db, stmt) =>
{
  const promise = new Promise((resolve, reject) => 
  {
    let sql = stmt ;
    db.query(sql, (err, results, fields) =>
    {
      let errmsg = '' ;
      let set1 = null ;
      if (err)
      {
        errmsg = err.message + ' ' + err.sql ;
        resolve({errmsg});
      }
      else if ( Array.isArray(results))
      {
        // got no results from sql select.
        if ( results.length == 0)
        {
          set1 = [] ;
        }
        else
        {
          const fsItem = results[0];
          if (fsItem.constructor.name == 'RowDataPacket')
            set1 = results;
          else
            set1 = results[0];
        }
        resolve( {errmsg, set1} );
      }
      else
      {
        resolve(results);
      }
    });
  });

  return promise;
}

// ---------------------------- mysql_select --------------------------------
// selectColumns - array of column names to be selected
// whereKeys : {key1:xxx, key2:yyy }  ( only select on whereKey when the key
//             value is truthy. )
// returns selected rows as array of objects. 
const mysql_select = async (db, tableName, selectColumns, whereKeys, 
                            orderByColumnNames ) =>
{
  const promise = new Promise((resolve, reject) =>
  {
    // build select sql statement.
    const qualSelectColumns = selectColumns.map((item) =>
    {
      return `a.${item}`;
    });
    const columnsText = qualSelectColumns.join(',');

    // order by clause.
    const qualOrderBy = orderByColumnNames.map((item) =>
    {
      return `a.${item}`;
    });
    let orderByText = qualOrderBy.join(',');
    if ( orderByText )
      orderByText = 'order by ' + orderByText ;

    // split whereKeys in array of key name and key values.
    const alias = 'a' ;
    const { whereClause, whereData } = sql_whereClauseBuilder(whereKeys, alias ) ;

    const sql = `SELECT ${columnsText} 
                FROM  ${tableName} a 
                ${whereClause}
                ${orderByText} `;

    // run the query to select the roww.
    const data = [...whereData];

    db.query(sql, data, (err, results, fields) =>
    {
      let errmsg = '';
      let set1 = null;
      if (err)
      {
        errmsg = err.message;
      }
      else if (Array.isArray(results) && (results.length > 0))
      {
        const fsItem = results[0];
        if ((fsItem.constructor.name == 'RowDataPacket') || (fsItem.constructor.name == 'TextRow'))
          set1 = results;
        else
          set1 = fsItem;
      }
      else
      {
        set1 = results;
      }

      resolve({ errmsg, set1 });
    });

  });
  return promise;
}

// ---------------------------- mysql_selectCount --------------------------------
// whereKeys : {key1:xxx, key2:yyy }
// returns count of rows that match where keys.
const mysql_selectCount = async (db, tableName, whereKeys) =>
{
  const promise = new Promise((resolve, reject) =>
  {
    const alias = 'a' ;
    const { whereClause, whereData } = sql_whereClauseBuilder(whereKeys,alias ) ;
    const sql = `SELECT count(*) rowCount 
                FROM  ${tableName} a 
                ${whereClause} `;

    // run the query to select the row.
    const data = [...whereData];
    db.query(sql, data, (err, results, fields) =>
    {
      if (err)
        reject(err);
      else
      {
        const row = results[0] ;
        const count = row.rowCount ;
        resolve( count );
      }
    });
  });
  return promise;
}

// ---------------------------- mysql_selectRow --------------------------------
// selectColumns - array of column names to be selected
// whereKeys : {key1:xxx, key2:yyy }
// returns object containing column values of selected row.
const mysql_selectRow = async( db, tableName, selectColumns, whereKeys ) =>
{
  const promise = new Promise((resolve, reject) =>
  {
    // build select sql statement.
    const qualSelectColumns = selectColumns.map((item) =>
      {
        return `a.${item}`;
      }) ;
    const columnsText = qualSelectColumns.join(',') ;

    const { whereClause, whereData } = sql_whereClauseBuilder(whereKeys ) ;

    const sql = `SELECT ${columnsText} 
                FROM  ${tableName} a 
                ${whereClause} ` ;

    // run the query to select the row.
    const data = [...whereData ];
    db.query(sql, data, (err, results, fields) =>
    {
      if (err)
        reject(err);
      else if ( results.length > 1 )
        reject('multiple rows selected. ' + sql) ;
      else  if ( results.length == 0 )
        resolve(null)
      else 
        resolve(results[0]);
    });
  });
  return promise ;
}

// ---------------------------- mysql_showCreateTable --------------------------------
// selectColumns - array of column names to be selected
// whereKeys : {key1:xxx, key2:yyy }
// returns object containing column values of selected row.
const mysql_showCreateTable = async (db, tableName ) =>
{
  const promise = new Promise((resolve, reject) =>
  {
    const sql = `show create table ${tableName} ` ;

    // run the query to select the row.
    const data = [];
    db.query(sql, data, (err, results, fields) =>
    {
      if (err)
        reject(err);
      else
      {
        const row = results[0] ;
        const createTableText = row['Create Table'];
        resolve({createTableText}) ;
      }
    });
  });
  return promise;
}

// ------------------------- mysql_tableColumns_select --------------------------
const mysql_tableColumns_select = async (db, database, tableName) =>
{
  const promise = new Promise((resolve, reject) => 
  {
    let sql = `SELECT a.column_name, a.data_type, 
                    case when a.is_nullable = TRUE then 'Y' else 'N' end is_nullable, 
                    a.column_default,
                    case when a.data_type = 'decimal' then a.numeric_precision
                          else coalesce(a.character_maximum_length,0) end lgth,
                coalesce(a.numeric_scale,0) prec,
                coalesce(a.column_default,'NULL') def,
                a.character_set_name
              from INFORMATION_SCHEMA.COLUMNS a
              where  a.table_schema = ? and a.table_name = ?
              order by a.ordinal_position ;` ;
    const data = [database, tableName];
    db.query(sql, data, (err, results, fields) =>
    {
      if (err)
        resolve({errmsg:err.errorMessage});
      else
        resolve({set1:results});
    });
  });

  return promise;
}

// ---------------------------- mysql_updateRow --------------------------------
// rowKeys : {key1:xxx, key2:yyy }
// updateColumns: { col1:vlu, col2:vlu }
const mysql_updateRow = async (db, tableName, rowKeys, updateColumns ) =>
{
  // read row.  get current values.
  const current = await mysql_selectRow(db, tableName, Object.keys(updateColumns), rowKeys ) ;

  // update changed columns. one at a time.
  let update_numColumns = 0 ;
  for( const colName of Object.keys(updateColumns))
  {
    const vlu = updateColumns[colName] ;
    const cur_vlu = current[colName] ;
    if ( vlu != cur_vlu )
    {
      await mysql_updateRowColumn( db, tableName, rowKeys, colName, vlu ) ;
      update_numColumns += 1 ;
    }
  }
  return {update_numColumns} ;
}

// ---------------------------- mysql_updateRowColumn --------------------------------
// rowKeys : {key1:xxx, key2:yyy }
// updateColumns: { col1:vlu, col2:vlu }
const mysql_updateRowColumn = async (db, tableName, rowKeys, colName, vlu) =>
{
  const promise = new Promise((resolve, reject) =>
  {
    // where clause.
    let whereText = '';
    for (const key of Object.keys(rowKeys))
    {
      if (whereText.length > 0)
        whereText += 'and ';
      whereText += `a.${key} = ? `;
    }

    const sql = `UPDATE  ${tableName} a
                SET ${colName} = ?  
                WHERE  ${whereText} `;

    // run the query to select the row.
    const data = [vlu, ...Object.values(rowKeys)];
    db.query(sql, data, (err, results, fields) =>
    {
      if (err)
        reject(err);
      else
        resolve(results) 
    });
  });
  return promise;
}

// ------------------------- mysql_useDatabase -----------------------------
const mysql_useDatabase = async (db, database) =>
{
  const promise = new Promise((resolve, reject) => 
  {
    let sql = `use ${database} ;` ;
    const data = [database] ;
    db.query(sql, data, (err, results, fields) =>
    {
      if (err)
        reject(err);
      resolve(results);
    });
  });

  return promise;
}

module.exports = { mysql_addColumn, mysql_alterColumn, 
  mysql_callFunc, mysql_callProc, mysql_callSelectProc, 
  mysql_currentDatabaseName,
        mysql_createObject, mysql_createTable, mysql_databases_select, 
          mysql_databaseTables_select, 
          mysql_deleteRows,
          mysql_dropColumn, mysql_dropTable, 
          mysql_insertRow,
          mysql_runFunction, mysql_runSelect,
          mysql_select, mysql_selectCount, mysql_selectRow, mysql_showCreateTable,
          mysql_tableColumns_select, 
          mysql_updateRow,
          mysql_useDatabase };

