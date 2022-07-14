const fs      = require('node:fs/promises');
const consts  = require('node:constants');
const util    = require('node:util');

const fsExt    = require('fs-ext');
const { EOL }  = require('node:os');

const seek = util.promisify(fsExt.seek);

const SEEK_SET = 0;
const SEEK_CUR = 1;
const SEEK_END = 2;

const yaml   = require('yaml');

let FileHandle;

let theEngines = {
  'yaml': ( aString ) => yaml.parse( aString )
};

async function findExcerpt( fh, delimiter, resetTo ) {
  let buf = Buffer.alloc( 1 );
  let [check, keep, pos] = [ "", "", 0];
  while( (await fh.read(buf, 0, 1)).bytesRead  ) {    
    let end = pos + delimiter.length;
    check = keep.slice(pos - (delimiter.length-1), pos);    
    let chr = buf.toString('utf8');    
    check = check.concat( chr );
    keep  = keep.concat( chr );
    
    if ( check == delimiter ) {
      // we have a delimiter matching so we need to reset
      return keep;
    }
    //console.log([ chr, check, delimiter, keep ]);
    pos++;
  }
  await seek(fh.fd, resetTo, SEEK_SET); 
  return null;
}

async function readMatterFh(fh, { delimiter = ['---','---'], eol = EOL, language = 'yaml', excerpts = false, engines = {}, ...options } = {} ) {
  let dbuf = Buffer.alloc( delimiter[0].length );  
  await fh.read(dbuf, 0, delimiter[0].length, 0);
  if ( dbuf.toString('utf8') == delimiter[0]) {
    let sizeof = ((await fh.stat()).size - delimiter[0].length);
    let buf = Buffer.alloc( sizeof );
    let bytesread = 0;
    while( bytesread < sizeof ) {
      await fh.read(buf, bytesread++, 1);

      if (bytesread > delimiter[1].length) {
	let start = bytesread - delimiter[1].length;
	let end   = start + delimiter[1].length;	
	let buf2 = buf.subarray(start, end);

	if (buf2.toString('utf8') == delimiter[1]) {

	  let pos = bytesread;
	  let excerpt;
	  if ( excerpts ) excerpt = await findExcerpt( fh, delimiter[1], pos );
	  	  
	  // we have found the end of the front matter.
	  // TODO: Still need to determine whether there is an excerpt to be extracted or not...
	  return new Promise( (resolve, reject) => {
	    let newbuf = buf.subarray( delimiter[0].length, (bytesread - delimiter[1].length) );
	    let matter = theEngines[ language ]( newbuf.toString('utf8') );
	    let object = {
	      excerpt,
	      fh, filehandle: fh,
	      data: matter
	    };

	    if ( !matter || !Object.keys( matter ).length ) {
	      matter.empty = newbuf.toString('utf8');
	      matter.isEmpty = true;
	    }
	    
	    return resolve( object );
	    //return resolve( [matter, fh] );
	  });
	}	
      }      
    }
  } else {
    
  }
};


module.exports = async function(file, { delimiter = ['---','---'], eol = EOL, language = 'yaml', engines = {}, ...options } = {} ) {
  if ( !Array.isArray(delimiter) ) delimiter = [ delimiter, delimiter ];

  if (!FileHandle) // its very annoying that njs libraries don't export the various classes for instances they create
    await (async () => {
      let fh = await fs.open(process.argv[1], consts.O_RDONLY);
      FileHandle = module.exports.FileHandle = fh.constructor;
      await fh.close();
    })()  
  
  delimiter = delimiter.map( e => `${e}${eol}` );

  Object.assign(theEngines, engines);

  let fh;
  if ( file instanceof FileHandle ) {
    fh = file;
  } else {
    fh = await fs.open(file, consts.O_RDONLY);
  }

  return readMatterFh( fh, { delimiter, eol, language, engines, ...options } );
}

