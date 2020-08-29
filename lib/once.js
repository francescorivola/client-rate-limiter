module.exports = function once (fn) {
  let result
  let executed = false
  return function onceFunc (...args) {
    if (executed) {
      return result
    }
    result = fn(...args)
    executed = true
    return result
  }
}
