'use strict'

import test from 'ava'
import micro from 'micro'
import listen from 'test-listen'
import request from 'request-promise'
import fixtures from './fixtures/'
import users from '../users'

// hook before de ava
test.beforeEach(async t => {
  let srv = micro(users)
  t.context.url = await listen(srv)
})

// ruta para guardar el usuario en BD
test('POST /', async t => {
  let user = fixtures.getUser()
  let url = t.context.url

  let options = {
    method: 'POST',
    uri: url,
    json: true,
    body: { // Cuerpo del usuario con el que se va a hacer el registro simulando el registro de usuario
      name: user.name,
      username: user.username,
      password: user.email
    },
    resolveWithFullResponse: true // resuelva la promesa con toda la respuesta
  }

  let response = await request(options)

  // el password y el email no se deben retornar
  delete user.email
  delete user.password

  t.is(response.statusCode, 201)
  t.deepEqual(response.body, user)
})

// Creación de ruta para obtener informacion guardado en DB
test('GET /:username', async t => {
  let user = fixtures.getUser()
  let url = t.context.url

  let options = {
    method: 'GET',
    uri: `${url}/${user.username}`,
    json: true
  }

  let body = await request(options)

  delete user.email
  delete user.password

  t.deepEqual(body, user)
})
