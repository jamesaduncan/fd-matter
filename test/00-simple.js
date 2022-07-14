const tap     = require('tap');
const matter  = require('../');
const { EOL } = require('os');
const consts  = require('node:constants');
const { seek } = require('fs-ext');

let fn = "test/test.md";

tap.ok(EOL.length, `EOL has a length (${EOL.length})`);

matter( fn ).then( ( object ) => {
  tap.ok(object instanceof Object, "data is an object");
  tap.ok(Reflect.has( object, 'data' ), "object has a data key");
  tap.ok(Reflect.has( object.data, 'layout'), "data has a layout key");
  tap.ok(Reflect.has( object, 'fh' ), "object has a fh key");
  tap.ok(Reflect.has( object, 'filehandle'), "object has a filehandle key");
  tap.same( object.fh, object.filehandle, "filehandle and fh are the same");
  tap.ok( object.fh instanceof matter.FileHandle, "fh is an instance of a filehandle");
  object.fh.readFile({ encoding: 'utf8' }).then( ( data ) => {
    tap.equal( data, "# Hello, world\r\n", "data is right");
    seek(object.filehandle.fd, 0, 0, (err, pos) => {
      matter( object.fh ).then( (o) => {
	tap.same(o, object, "seek to zero and start again - matter( <FileHandle> ) works too");
	object.fh.close();
      });
    });
  });
});

matter( fn, { delimiter: '---' } ).then( (object) => {
  tap.ok(Reflect.has( object, 'data'), "still worked with single delimiter specified");
  tap.ok(Reflect.has( object.data, 'layout' ), "key is properly specified");
});
