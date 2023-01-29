// src/common/core-funcs.js

// ------------------------------- array_getSingleItem ----------------------------
// variable is expected to be an array with a single element. Return that single 
// item or otherwise, return null.
function array_getSingleItem(arr)
{
  if (Array.isArray(arr) && arr.length == 1)
    return arr[0];
  else
    return null;
}

// ------------------------------- arr_itemAtLenient -------------------------------
function arr_itemAtLenient(arr, index)
{
  if (index < 0)
    return null;
  else if (index < arr.length)
    return arr[index];
  else
    return null;
}

// --------------------------------- arr_nextCircularIndex ---------------------------------
// increment to the next array index. If next index exceeds end of array cycle 
// around to the first item in the array.
// option { adv }   adv: advance index by number of items. -1 - advance to prev item.
function arr_nextCircularIndex(arr, ix, option)
{
  const adv = (option && option.adv) ? option.adv : 1;
  let nextIx = ix + adv;
  if (!arr || (arr.length == 0))
    return -1;
  if (nextIx < 0)
    nextIx = arr.length - 1;
  else if (nextIx >= arr.length)
    nextIx = 0;
  return nextIx;
}

// ---------------------------- date_currentISO -------------------------------
function date_currentISO()
{
  let dt = new Date();
  return date_toISO(dt);
}

// --------------------- date_toISO -----------------------------
// convert date to ISO format. yyyy-mm=dd
function date_toISO(d)
{
  function pad(n) { return n < 10 ? '0' + n : n }

  return d.getUTCFullYear() + '-'
    + pad(d.getUTCMonth() + 1) + '-'
    + pad(d.getUTCDate());
}

// --------------------------------- sql_argumentMarkerBuilder -----------------------
// arguments: {arg1, arg2, ... }
// returns { argData, argMarker }
function sql_argumentMarkerBuilder(argObject)
{
  const argData = [];
  let argMarker = '';

  // build where clause and whereData. ( where keys are only used when the key 
  // value is truthy. )
  for (const arg of Object.keys(argObject))
  {
    const vlu = argObject[arg];
    if (argMarker.length > 0)
      argSequece += ', ';

    argMarker += `?`;
    argData.push(vlu);
  } 

  return { argData, argMarker };
}

// --------------------------------- sql_whereClauseBuilder -----------------------
// whereKeys: {key1, key2, ...}
// alias: table name alias that qualifies references to key names in the sql stmt.
//        WHen used, the common value is 'a'. Key names are qualified as a.key1.
function sql_whereClauseBuilder( whereKeys, alias )
{
  const whereData = [];
  let whereClause = '';

  const aliasText = alias ? `${alias}.` : '' ;

  // build where clause and whereData. ( where keys are only used when the key 
  // value is truthy. )
  for (const key of Object.keys(whereKeys))
  {
    const vlu = whereKeys[key];
    if (vlu)
    {
      if (whereClause.length > 0)
        whereClause += 'and ';
      else
        whereClause = ' WHERE ';

      whereClause += `${aliasText}${key} = ? `;
      whereData.push(vlu);
    }
  }

  return { whereData, whereClause } ;
}

module.exports = { array_getSingleItem, arr_nextCircularIndex, date_currentISO, 
        date_toISO, 
        sql_argumentMarkerBuilder, sql_whereClauseBuilder };
