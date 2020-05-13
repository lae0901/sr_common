// ./src/common/string-funcs.js

// -------------------------------- string_clip ---------------------------------
function string_clip( text, lgth )
{
  if ( text.length <= lgth )
    return text ;
  else
    return text.substr(0,lgth) ;
}

// --------------------------- string_ensureQuoted ----------------------------
function string_ensureQuoted( text, quoteChar )
{
  quoteChar = quoteChar || `'`;
  let quotedText = text ;

  if ( string_head(text,1) != quoteChar )
  {
    quotedText = `${quoteChar}${text}${quoteChar}`;
  }

  return quotedText ;
}

// -------------------------- string_head ----------------------
// return the front of the string
function string_head(text, lx)
{
  if (!text)
    return '';
  if (lx > text.length)
    lx = text.length;
  if (lx <= 0)
    return '';
  else
    return text.substr(0, lx);
}


// -------------------- string_replaceAll -----------------------
// replace all occurance of findText with replaceText
function string_replaceAll(str, findText, replaceText)
{
  let res = '';
  let ix = 0;
  while (ix < str.length)
  {
    const fx = str.indexOf(findText, ix);

    // length from start to found position
    let lx = 0;
    if (fx == -1)
      lx = str.length - ix;
    else
      lx = fx - ix;

    // copy not match text to result.
    if (lx > 0)
      res += str.substr(ix, lx);

    // match found. add replacement text to result.
    if (fx != -1)
      res += replaceText;

    // advance in str.
    if (fx == -1)
      ix = str.length;
    else
      ix = fx + findText.length;
  }
  return res;
}

// --------------------- string_replaceAt -----------------
// replace substr in string at the specified location.
function string_replaceAt(text, bx, lx, rplText)
{
  var beforeText = '';
  var afterText = '';
  if (bx > 0)
    beforeText = text.substr(0, bx);
  var nx = bx + lx;
  if (nx < text.length)
    afterText = text.substr(nx);

  return beforeText + rplText + afterText;
}

module.exports = {string_clip, string_ensureQuoted, string_head, string_replaceAll, string_replaceAt} ;
