'use strict'

const test = require('ava')
const uuid = require('uuid-base62')
const r = require('rethinkdb')
const Db = require('../')
const utils = require('../lib/utils')
const fixtures = require('./fixtures')

test.beforeEach('setup database', async t => { // antes de correr el test para crear la BD de prueba
  const dbName = `platzigram_${uuid.v4()}` // creamos un nombre de base de datos aleatorio
  const db = new Db({ db: dbName, setup: true }) // instanciamos la BD con el nombre de la BD que se creo
  await db.connect() // conectarse a la base de datos
  t.context.db = db
  t.context.dbName = dbName
  t.true(db.connected, 'should be connected') // para que me diga que la BD está conectada
})

test.afterEach.always('cleanup database', async t => { // metodo despues de correr el test para eliminar la DB de prueba
  let db = t.context.db
  let dbName = t.context.dbName
  await db.disconnect()
  t.false(db.connected, 'should be disconnected')

  let conn = await r.connect({}) // los parametros de conxion estan por default entonces se los paso vacios
  await r.dbDrop(dbName).run(conn) // borrar la base de datos
})

test('save image', async t => { // test para grabar imagen
  let db = t.context.db

  t.is(typeof db.saveImage, 'function', 'saveImage is a function') // con esto garantizo que la clase DB tenga el metodo saveImage

  let image = fixtures.getImage() // llamamos la clase fixtures con el metodo getImage y se lo asignamos a la variable image

  let created = await db.saveImage(image)
  t.is(created.description, image.description) // descripcion de la imagen
  t.is(created.url, image.url) // url de la imagen
  t.is(created.likes, image.likes) // los likes de la imagen
  t.is(created.liked, image.liked) // falso o verdadero cuando la imagen tiene like
  t.deepEqual(created.tags, [ 'awesome', 'tags', 'platzi' ]) // los tag de la imagen
  t.is(created.userId, image.userId) // userId de la imagen
  t.is(typeof created.id, 'string')
  t.is(created.publicId, uuid.encode(created.id))
  t.truthy(created.createdAt) // comprobamos que la fecha se haya implementado
})

test('like image', async t => {
  let db = t.context.db
  t.is(typeof db.likeImage, 'function', 'likeImage is a function') // garantizamos que la clase de BD tenga un metodo likeimage
  let image = fixtures.getImage() // cargamos los datos de la imagen
  let created = await db.saveImage(image) // hay que guardar la imagen
  let result = await db.likeImage(created.publicId) // vemos el resultado de Like images pasandoles del

  t.true(result.liked) // garantizamos que la imagen nos va retornar liked
  t.is(result.likes, image.likes + 1) // y decimos que los likes de la imagen van a ser igual a los likes de la informacion anterior + 1 like
})

test('get image', async t => {
  let db = t.context.db

  t.is(typeof db.getImage, 'function', 'getImage is a function')

  let image = fixtures.getImage() // obtenemos la imagen de los fixtures
  let created = await db.saveImage(image) // almacenamos los datos de la imagen en la BD
  let result = await db.getImage(created.publicId) // y la obtenemos de la base de datos por su ID

  t.deepEqual(created, result)

  await t.throws(db.getImage('foo'), /not found/) // expectativa de error cuando yo tenga una imagen de la BD que no exista
})

test('list all images', async t => {
  let db = t.context.db

  let images = fixtures.getImages(3) // instanciamos el metodo getimages de fixturex y le pasamos como parametros 3
  let saveImages = images.map(img => db.saveImage(img))
  let created = await Promise.all(saveImages)
  let result = await db.getImages()

  t.is(created.length, result.length)
})

test('save user', async t => {
  let db = t.context.db

  t.is(typeof db.saveUser, 'function', 'saveUser is a function') // garantizamos que la funcion exista

  let user = fixtures.getUser() // obtenemos el usuario de los fixtures
  let plainPassword = user.password // dejamos una referencia del password en texto plano
  let created = await db.saveUser(user) // guardamos nuestro usuario en la BD

  t.is(user.username, created.username) // usuario que yo cree en la BD tenga el mismo username
  t.is(user.email, created.email) // el mail que se creo sea igual que el email.
  t.is(user.name, created.name)
  t.is(utils.encrypt(plainPassword), created.password) // Encripto el texto plano y garantizamos que el usuario que se creo nos devuelva la version encriptada
  t.is(typeof created.id, 'string') // el id venga con id de tipo string
  t.truthy(created.createdAt)
})

test('get user', async t => {
  let db = t.context.db

  t.is(typeof db.getUser, 'function', 'getUser is a function')

  let user = fixtures.getUser() // obtenemos el usuario
  let created = await db.saveUser(user) // guardamos el usuario en la BD
  let result = await db.getUser(user.username) // obtenemos el usario por el username

  t.deepEqual(created, result)

  await t.throws(db.getUser('foo'), /not found/)
})

test('authenticate user', async t => {
  let db = t.context.db

  t.is(typeof db.authenticate, 'function', 'authenticate is a function')

  let user = fixtures.getUser() // obtenemos el usuario de los fixtures
  let plainPassword = user.password // obtenemos el password en texto plano para compararlo e encriptarlo despues
  await db.saveUser(user) // grabamos el usuario

  let success = await db.authenticate(user.username, plainPassword) // probamos el camino exitoso
  t.true(success)

  let fail = await db.authenticate(user.username, 'foo') // probamos el fallo
  t.false(fail)

  let failure = await db.authenticate('foo', 'bar') // pasamos al test un usuario que no existe y password que no exista
  t.false(failure) // falla
})

test('list images by user', async t => {
  let db = t.context.db

  t.is(typeof db.getImagesByUser, 'function', 'getImagesByUser is a function')

  let images = fixtures.getImages(10) // creamos las imagenes desde los fixtures
  let userId = uuid.uuid() // creamos el usuario
  let random = Math.round(Math.random() * images.length) // numero aleatorio para hacer la consulta
  let saveImages = [] // guardo las imagenes en un arreglo saveImages
  for (let i = 0; i < images.length; i++) { // ciclo de iteracion para cada una de las imagenes
    if (i < random) { // si mi indice es menor al numero aleatorio que se creó
      images[i].userId = userId // vamos a cambiar el userId por el userId que se creó
    }

    saveImages.push(db.saveImage(images[i])) // guardamos las promesas en un arreglo
  }

  await Promise.all(saveImages) // resolvemos el arreglo de promesas con Promise.all

  let result = await db.getImagesByUser(userId) // obtenemos el resultado con el getImagesByUser y le pasamos el userId
  t.is(result.length, random) // garantizamos el el tamaño del resultado de las imagenes creadas sea igual al # aleatorio
})

test('list images by tag', async t => {
  let db = t.context.db

  t.is(typeof db.getImagesByTag, 'function', 'getImagesByTag is a function')

  let images = fixtures.getImages(10) // generamos 10 imagenes en el tag
  let tag = '#filterit'
  let random = Math.round(Math.random() * images.length)

  let saveImages = []
  for (let i = 0; i < images.length; i++) {
    if (i < random) {
      images[i].description = tag
    }

    saveImages.push(db.saveImage(images[i]))
  }

  await Promise.all(saveImages)

  let result = await db.getImagesByTag(tag)
  t.is(result.length, random)
})
