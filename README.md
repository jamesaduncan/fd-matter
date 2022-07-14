# fd-matter

> grey-matter is a great module, but sometimes, you just need to work with filehandles rather than filenames.

## API

```js
const matter = require('fd-matter');

( async () => {
	let { filehandle, data } = await matter( 'file.html' );
	await filehandle.close();
})();

```




