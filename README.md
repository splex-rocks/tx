Tx: chainable rollback-able routines
====================================

Tx implements rollback-able transactions with a Promise-based API.

# Installation

```
npm install txjs
```

# Usage

## Creating a step

An initial transaction step is created by calling the Tx constructor:

```javascript
const Tx = require('txjs')

let tx = new Tx(
  function foward() {
    // Do something that can be undone
  },
  function backward() {
    // Undo this step, a *later* step failed
  }
)
```

Or you can chain to a previous step, just as you would with a Promise:

```javascript
let tx = new Tx(step1Forward, step1Backward)
tx.chain(step2Forward)
.chain(step3Forward, step3Backward)
```

Notice that the backward routine is optional. Keep in mind that if a step
doesn't need rollback you can probably merge it with the next one. However, the
possibility of not having a backward step is supported for flexibility.

## Running a transaction

Once you're done setting up your chain, you can run it. You get a Promise for
the result of the last step in the chain.

```javascript
new Tx(function () {
  return 3
})
.run()
.then(function (value) {
  console.log(value) // 3
})

```

Each forward step is called with the return value of the previous one. If you're
used to chaining promises, it should be seamless.

```javascript
new Tx(function () {
  return 3
})
.chain(function (three) {
  return three + 1
})
.run()
.then(function (value) {
  console.log(value) // 4
})
```

If a step returns a Promise, it will be waited upon and its resolution value
will be passed to the next step. If it's rejected, rollback will be triggered.

```javascript
new Tx(function () {
  return Promise.resolve(3)
})
.chain(function (three) {
  return three + 1
})
.run()
.then(function (value) {
  console.log(value) // 4
})
```

[//]: # (TODO Include rejection example)

When a step fails, besides starting the rollback chain upwards, the error that
caused the rollback will be the rejection reason of the returned Promise.

```javascript
new Tx(function () {
  return 3
})
.chain(function (three) {
  throw 'something ugly'
})
.run()
.catch(function (reason) {
  console.log(reason) // 'something ugly'
})
```

## Rolling back

You may roll back a transaction by throwing an error (or rejecting a returned
Promise) in your forward routine. The backward routine will receive the return
value of the forward routine for its step. Keep in mind that such value might
have mutated:

```javascript

function createDirectoryInFilesystem() {
  const dirname = createRandomDirname()
  fs.mkdirSync(dirname)
  return dirname
}

function deleteDirectory(dirname) {
  // Backward routine gets the dirname returned by createDirectoryInFilesystem
  fs.rmdirSync(dirname)
}

new Tx(createDirectoryInFilesystem, deleteDirectory)
.chain(createFileInDirectory, deleteFile)
.chain(function () {
  throw new Error('Changed my mind, delete everything')
})
.run()
```

In the example, `deleteFile` will be called, then `deleteDirectory`. If a
backward step returns a Promise, the previous step will be rolled back once it
resolves.

Currently, if a backward step throws or returns a rejected Promise, rollback is
aborted and no previous steps' backward routines are called from then on. This
will be configurable in future versions (PRs welcome!).

# TO-DO

- [ ] Fail construction if forward step is not a function.
- [ ] Save custom resolution value for step (e.g., to prevent mutation from screwing up data needed to roll back)
- [ ] Commit: prevent rollback of steps "upwards" in the chain.
- [ ] Access to the backward (rollback) promise chain.
- [ ] Catch backward (rollback) errors. Provide configuration parameter for continuing or aborting rollback.
- [ ] Code refactor.
