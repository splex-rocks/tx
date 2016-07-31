const Tx = require('../lib/tx')

const unexpectedFulfillment = () => {
  throw new Error('should have rejected')
}
const assertError = error => {
  error.should.be.an.instanceof(Error)
}

describe('tx', function () {

  describe('constructor', function () {
    it('should return an instance of Tx', function () {
      const tx = new Tx()
      tx.should.be.an.instanceof(Tx)
    })
  })

  describe('run method', function () {
    it('should run forward routine when called', function (done) {
      new Tx(function () {
        done()
      })
      .run()
    })

    it('should return a Promise', function () {
      const returnValue = (new Tx()).run()
      returnValue.should.be.an.instanceof(Promise)
    })

    it('should resolve to a value returned by the forward routine', function () {
      const expected = Symbol('expected')
      return new Tx(function () {
        return expected
      })
      .run()
      .then(observed => {
        (observed === expected).should.be.true
      })
    })

    it('should chain to promise returned by the forward routine', function () {
      const expected = Symbol('expected')
      return new Tx(function () {
        return Promise.resolve(expected)
      })
      .run()
      .then(observed => {
        (observed === expected).should.be.true
      })
    })

    it('should reject with error thrown in forward routine', function () {
      const error = new Error('error')
      return new Tx(() => {
        throw error
      })
      .run()
      .then(() => done(new Error('expected rejection')))
      .catch(reason => {
        reason.should.equal(error)
      })
    })

    it('should reject with rejection from forward routine', function () {
      const error = new Error('error')
      return new Tx(() => {
        return Promise.reject(error)
      })
      .run()
      .then(() => {
        throw new Error('expected rejection')
      })
      .catch(reason => {
        reason.should.equal(error)
      })
    })

    it('should wait for promise resolution before calling next forward routine')

    it('should reject when called multiple times', function () {
      const tx = new Tx(() => {})
      return tx.run()
      .catch(unexpectedError => {
        throw new Error('unexpected rejection' + unexpectedError)
      })
      .then(() => {
        return tx.run()
      })
      .then(unexpectedFulfillment, assertError)
    })
  })

  describe('rollback', function () {

    it('should not execute same step backward routine', function (done) {
      const forward = () => {
        throw new Error()
      }
      const backward = () => {
        done(new Error('unexpected backward call'))
      }
      new Tx(forward, backward)
      .run()
      .catch(() => {
        done()
      })
    })

    it('upon throw should run backward routine of previous step', function (done) {
      const forward = () => {}
      const backward = () => {
        done()
      }
      new Tx(forward, backward)
      .chain(() => {
        throw 'error that triggers rollback'
      })
      .run()
      .then(unexpectedFulfillment)
    })

    it('upon rejection should run backward routine of previous step', function (done) {
      const forward = () => {}
      const backward = () => {
        done()
      }
      new Tx(forward, backward)
      .chain(() => {
        return Promise.reject('error that triggers rollback')
      })
      .run()
      .then(unexpectedFulfillment)
    })

    it('should pass forward routine return value to backward routine', function (done) {
      const expected = Symbol('value')
      const forward = () => expected
      const backward = (observed) => {
        try {
          (observed === expected).should.be.true
          done()
        } catch (e) {
          done(e)
        }
      }
      new Tx(forward, backward)
      .chain(() => {
        throw 'error that triggers rollback'
      })
      .run()
      .then(unexpectedFulfillment)
    })
  })

  describe('chain method', function () {
    it('should return an instance of Tx', function () {
      const chained = new Tx(() => {}).chain(() => {})
      chained.should.be.an.instanceof(Tx)
    })
  })

  describe('_rollback (private) method', function () {
    it('should reject if invoked before running', function () {
      return new Tx(() => {})
      ._rollback()
      .then(unexpectedFulfillment)
      .catch(assertError)
    })

    it('should wait for promise resolution before rolling back previous step')
  })

})
