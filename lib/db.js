'use strict'

const co = require('co')
const r = require('rethinkdb')
const Promise = require('bluebird')
const uuid = require('uuid-base62')
const utils = require('./utils')

const defaults = {
  host: 'localhost',
  port: 28015,
  db: 'platzigram'
}

class Db {
  constructor (options) {
    options = options || {}
    this.host = options.host || defaults.host
    this.port = options.port || defaults.port
    this.db = options.db || defaults.db
    this.setup = options.setup || false
  }

  connect (callback) {
    this.connection = r.connect({
      host: this.host,
      port: this.port
    })

    this.connected = true

    let db = this.db // con esto le indicamos que está conectada la BD
    let connection = this.connection

    if (!this.setup) {
      return Promise.resolve(connection).asCallback(callback)
    }

    let setup = co.wrap(function * () { // para crear una base datos espejo para no trajar en la BD de producciion
      let conn = yield connection // conectarnos a la DD o hacer referencia de la conexion

      let dbList = yield r.dbList().run(conn) // obtener la lista de las BDs y crear la BD si no existe
      if (dbList.indexOf(db) === -1) { // si no esta la bd la creamos
        yield r.dbCreate(db).run(conn)
      }

      let dbTables = yield r.db(db).tableList().run(conn) // run(conn) es como si estuvieramos dando click a DATAEXPLORER de RethinkDB
      if (dbTables.indexOf('images') === -1) {
        yield r.db(db).tableCreate('images').run(conn)
        yield r.db(db).table('images').indexCreate('createdAt').run(conn) // crear el indice para la tabla imagenes para hacer el getImages
        yield r.db(db).table('images').indexCreate('userId', { multi: true }).run(conn) // crear un nuevo indice para la tabla de imagenes
      }

      if (dbTables.indexOf('users') === -1) {
        yield r.db(db).tableCreate('users').run(conn)
        yield r.db(db).table('users').indexCreate('username').run(conn) // crear el indice username para hacer el getuser
      }

      return conn
    })

    return Promise.resolve(setup()).asCallback(callback)
  }

  disconnect (callback) { // desconectar la DB por si hay algun error
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback) // metod hibrido que recibe promesa o CALLBACK
    }

    this.connected = false
    return Promise.resolve(this.connection)
      .then((conn) => conn.close()) // cerrar la conexion
  }

  saveImage (image, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection // referenciamos nuestra conexion
    let db = this.db // referenciamos la BD

    let tasks = co.wrap(function * () { // corutina de tareas
      let conn = yield connection // nos conectamos a la BD resolviendo la promesa
      image.createdAt = new Date() // definimos una fecha de creacion
      image.tags = utils.extractTags(image.description) // definimos una nueva propiedad que es e los tags

      let result = yield r.db(db).table('images').insert(image).run(conn) // almacenamos este en la DB

      if (result.erros > 0) { // si el resultado me trae algun error o es mayor de cero
        return Promise.reject(new Error(result.first_error)) // rechazamos la promesa, con un objeto de error y que muestre el 1er error
      }

      image.id = result.generated_keys[0] // en RETHINKB genera un generated_keys le pasamos la primera posicion

      yield r.db(db).table('images').get(image.id).update({
        publicId: uuid.encode(image.id)
      }).run(conn)

      let created = yield r.db(db).table('images').get(image.id).run(conn)

      return Promise.resolve(created)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  likeImage (id, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection // obtiene la conexion
    let db = this.db // verifica la conexion
    let getImage = this.getImage.bind(this) // obtenemos la refencia de getImage

    let tasks = co.wrap(function * () {
      let conn = yield connection

      let image = yield getImage(id)
      yield r.db(db).table('images').get(image.id).update({ // actualizamos la imagen
        liked: true,
        likes: image.likes + 1
      }).run(conn)
      let created = yield getImage(id)
      return Promise.resolve(created)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  getImage (id, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db
    let imageId = uuid.decode(id)

    let tasks = co.wrap(function * () {
      let conn = yield connection
      let image = yield r.db(db).table('images').get(imageId).run(conn)

      if (!image) { // si la imagen no existe
        return Promise.reject(new Error(`image ${imageId} not found`))
      }

      return Promise.resolve(image)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  getImages (callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection

      let images = yield r.db(db).table('images').orderBy({ // consulta a la BD por orden descendente
        index: r.desc('createdAt')
      }).run(conn)

      let result = yield images.toArray()

      return Promise.resolve(result)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  saveUser (user, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection
      user.password = utils.encrypt(user.password) // encriptamos el password
      user.createdAt = new Date() // fecha actual

      let result = yield r.db(db).table('users').insert(user).run(conn)

      if (result.erros > 0) {
        return Promise.reject(new Error(result.first_error))
      }

      user.id = result.generated_keys[0]

      let created = yield r.db(db).table('users').get(user.id).run(conn)

      return Promise.resolve(created)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  getUser (username, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection

      yield r.db(db).table('users').indexWait().run(conn)
      let users = yield r.db(db).table('users').getAll(username, { // la tabla de usuarios users
        index: 'username'
      }).run(conn)

      let result = null

      try {
        result = yield users.next() // como users va a retornar un cursor yo lo recorro con next()
      } catch (e) {
        return Promise.reject(new Error(`user ${username} not found`))
      }

      return Promise.resolve(result)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  authenticate (username, password, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let getUser = this.getUser.bind(this)

    let tasks = co.wrap(function * () {
      let user = null
      try {
        user = yield getUser(username)
      } catch (e) {
        return Promise.resolve(false)
      }

      if (user.password === utils.encrypt(password)) {
        return Promise.resolve(true)
      }

      return Promise.resolve(false)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  getImagesByUser (userId, password, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection

      yield r.db(db).table('images').indexWait().run(conn) // esperamos a que los indices sean creados en la BD
      let images = yield r.db(db).table('images').getAll(userId, {
        index: 'userId'
      }).orderBy(r.desc('createdAt')).run(conn)

      let result = yield images.toArray()

      return Promise.resolve(result)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }

  getImagesByTag (tag, callback) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(callback)
    }

    let connection = this.connection
    let db = this.db
    tag = utils.normalize(tag) // normalizamos el tag para que nos entregue el tag en minuscula y sin el hash

    let tasks = co.wrap(function * () {
      let conn = yield connection

      yield r.db(db).table('images').indexWait().run(conn)
      let images = yield r.db(db).table('images').filter((img) => {
        return img('tags').contains(tag) // devolvemos todas las imagenes que en su campo tags contenga el tag que nostros creamos
      }).orderBy(r.desc('createdAt')).run(conn)

      let result = yield images.toArray()

      return Promise.resolve(result)
    })

    return Promise.resolve(tasks()).asCallback(callback)
  }
}

module.exports = Db
