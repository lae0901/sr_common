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


module.exports = {string_clip, string_ensureQuoted} ;
