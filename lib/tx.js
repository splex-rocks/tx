class Tx {
  constructor(forward, backward) {
    // TODO Validate forward step
    this._forward = forward
    this._backward = backward
  }

  chain(forward, backward) {
    this._nextStep = new Tx(forward, backward)
    this._nextStep._previousStep = this
    return this._nextStep
  }

  // TODO Refactor into simpler methods
  run() {
    return Promise.resolve()
    .then(() => {

      if (this._hasRun) {
        return Promise.reject(new Error('Transaction already run'))
      }
      this._hasRun = true

      // TODO Consider initializing _previousStep to an "empty tx step" to avoid this
      if (this._previousStep) {
        return this._previousStep
      } else {
        return {
          run() { return Promise.resolve() }
        }
      }
    })
    .then(previous => previous.run())
    .then(() => {
      const previousValue = this._previousValue()
      try {
        // TODO Provide a mechanism to set custom _resolutionValue (e.g. for
        // cloning and preventing mutation, or to make backward step simpler)
        // User should bind forward to a `this` if needed
        this._resolutionValue = this._forward.call(undefined, previousValue)
      } catch (error) {
        this._startRollback(error)
        return Promise.reject(error)
      }
      return Promise.resolve(this._resolutionValue)
      .catch(rejection => {
        this._startRollback(rejection)
        throw rejection
      })
    })
  }

  value() {
    return this._resolutionValue
  }

  _rollback() {
    return Promise.resolve()
    .then(() => {
      if (!this._hasRun) {
        throw new Error('Transaction not run, can\'t rollback')
      }
      if (this._backward) {
        // User should bind backward to a `this` if needed
        return Promise.resolve(this._backward.call(undefined, this._resolutionValue))
      }
    })
    // FIXME Even if this step's backward routine fails, we might want to call
    // previous steps' rollback... It might be a config param
    .then(() => {
      // TODO Consider initializing _previousStep to an "empty tx step" to avoid this
      if (this._previousStep) {
        return this._previousStep._rollback()
      }
    })
  }

  _startRollback(reason) {
    this._rollbackReason = reason
    if (this._previousStep) {
      this._previousStep._rollback()
    }
  }

  _previousValue() {
    // TODO Consider initializing _previousStep to an "empty tx step" to avoid this
    if (this._previousStep) {
      return this._previousStep.value()
    }
  }
}

module.exports = Tx
