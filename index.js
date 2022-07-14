const fs      = require('node:fs/promises');
const consts  = require('node:constants');

const { seek } = require('fs-ext');
const { EOL }  = require('node:os');

const SEEK_SET = 0;
const SEEK_CUR = 1;
const SEEK_END = 2;

const yaml   = require('yaml');

let FileHandle;

let theEngines = {
  'yaml': ( aString ) => yaml.parse( aString )
};

async function readMatterFh(fh, { delimiter = ['---','---'], eol = EOL, language = 'yaml', engines = {}, ...options } = {} ) {
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
	  // we have found the end of the front matter.
	  // TODO: Still need to determine whether there is an excerpt to be extracted or not...
	  return new Promise( (resolve, reject) => {
	    let newbuf = buf.subarray( delimiter[0].length, (bytesread - delimiter[1].length) );
	    let matter = theEngines[ language ]( newbuf.toString('utf8') );
	    let object = {
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

