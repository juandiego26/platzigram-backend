'use strict'

const test = require('ava')
const utils = require('../lib/utils')

test('extracting hashtags from text', t => {
  let tags = utils.extractTags('a #picture with tags #AwEsOmE #Platzi #AVA and #100 ##yes')

  t.deepEqual(tags, [
    'picture',
    'awesome',
    'platzi',
    'ava',
    '100',
    'yes'
  ])

  tags = utils.extractTags('a picture with no tags') // si el texto no tiene tags
  t.deepEqual(tags, [])

  tags = utils.extractTags() // si ejecuta la misma funcion sin tags
  t.deepEqual(tags, [])

  tags = utils.extractTags(null) // que la imagen llegue sin tags
  t.deepEqual(tags, [])
})

test('encrypt password', t => { // utilidad para encriptar password
  let password = 'foo123' // tenemos un password 'foo123'
  let encrypted = '02b353bf5358995bc7d193ed1ce9c2eaec2b694b21d2f96232c9d6a0832121d1' // una contraseña encriptada

  let result = utils.encrypt(password) // el resultado de utils.encrypt del password
  t.is(result, encrypted) // y el resultado va ser igual al password encrypted
})
