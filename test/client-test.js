'use strict'

const test = require('ava')
const nock = require('nock')
const platzigram = require('../') // requerimos la libreria que vamos a probar para este caso requerimos index.js
const fixtures = require('./fixtures')

let options = {
  endpoints: {
    pictures: 'http://platzigram.test/picture',
    users: 'http://platzigram.test/user',
    auth: 'http://platzigram.test/auth'
  }
}

test.beforeEach(t => {
  t.context.client = platzigram.createClient(options)
})

test('client', t => {
  const client = t.context.client

  t.is(typeof client.getPicture, 'function') // llamado a la ruta getPicture
  t.is(typeof client.savePicture, 'function') // llamado a la ruta HTTP request POST
  t.is(typeof client.likePicture, 'function') // llamado a la ruta de Like
  t.is(typeof client.listPictures, 'function') // llamado a la peticion HTTP /list del micro de pictures
  t.is(typeof client.listPicturesByTag, 'function')
  t.is(typeof client.saveUser, 'function')
  t.is(typeof client.getUser, 'function')
  t.is(typeof client.auth, 'function')
})

test('getPicture', async t => {
  const client = t.context.client

  let image = fixtures.getImage()

  nock(options.endpoints.pictures) // se le pasa los parametros defindos en options
  .get(`/${image.publicId}`) // peticion a la URL
  .reply(200, image)

  let result = await client.getPicture(image.publicId)

  t.deepEqual(image, result)
})

test('savePicture', async t => {
  const client = t.context.client

  let token = 'xxx-xxx-xxx-xxx'
  let image = fixtures.getImage()
  let newImage = {
    src: image.src,
    description: image.description
  }

  nock(options.endpoints.pictures, {
    reqheaders: {
      'Authorization': `Bearer ${token}`
    }
  }) // se le pasa los parametros defindos en options
  .post('/', newImage) // peticion a la URL
  .reply(201, image)

  let result = await client.savePicture(newImage, token)

  t.deepEqual(result, image)
})

test('likePicture', async t => {
  const client = t.context.client

  let image = fixtures.getImage()
  image.liked = true
  image.likes = 1

  nock(options.endpoints.pictures) // se le pasa los parametros defindos en options
  .post(`/${image.publicId}/like`) // peticion a la URL
  .reply(200, image)

  let result = await client.likePicture(image.publicId)

  t.deepEqual(image, result)
})

test('listPictures', async t => {
  const client = t.context.client

  let images = fixtures.getImages(3)

  nock(options.endpoints.pictures) // se le pasa los parametros defindos en options
  .get('/list') // peticion a la URL
  .reply(200, images)

  let result = await client.listPictures()

  t.deepEqual(images, result)
})

test('listPicturesByTag', async t => {
  const client = t.context.client

  let images = fixtures.getImages(3)
  let tag = 'platzi'

  nock(options.endpoints.pictures) // se le pasa los parametros defindos en options
  .get(`/tag/${tag}`) // peticion a la URL
  .reply(200, images)

  let result = await client.listPicturesByTag(tag)

  t.deepEqual(images, result)
})

test('saveUser', async t => {
  const client = t.context.client

  let user = fixtures.getUser()
  let newUser = {
    username: user.username,
    name: user.name,
    email: 'user@platzi.test',
    password: 'pl4zi'
  }

  nock(options.endpoints.users)
  .post('/', newUser) // peticion a la URL
  .reply(201, user)

  let result = await client.saveUser(newUser)

  t.deepEqual(result, user)
})

test('getUser', async t => {
  const client = t.context.client

  let user = fixtures.getUser()

  nock(options.endpoints.users)
  .get(`/${user.username}`) // peticion a la URL
  .reply(200, user)

  let result = await client.getUser(user.username)

  t.deepEqual(result, user)
})

test('auth', async t => {
  const client = t.context.client

  let credentials = {
    username: 'freddier',
    password: 'pl4zi'
  }

  let token = 'xxx-xxx-xxx'

  nock(options.endpoints.auth)
  .post('/', credentials) // peticion a la URL
  .reply(200, token)

  let result = await client.auth(credentials.username, credentials.password)

  t.deepEqual(result, token)
})
