'use strict'

const crypto = require('crypto')

const utils = {
  extractTags,
  normalize,
  encrypt
}

function extractTags (text) {
  if (text == null) return []

  let matches = text.match(/#(\w+)/g)

  if (matches === null) return []

  matches = matches.map(normalize)

  return matches
}

function normalize (text) {
  text = text.toLowerCase()
  text = text.replace(/#/g, '')
  return text
}

function encrypt (password) { // la funcion encrypt le pasamos el password
  let shasum = crypto.createHash('sha256') // creamos el sha con el comando cryto.createHash utilizando el algorimo sha256
  shasum.update(password) // Ese sha lo vamos a actualizar con el valor que vamos a encriptar
  return shasum.digest('hex') // Retornemos el valor del hash con el comando shasum.digest en hexadecimal
}

module.exports = utils
