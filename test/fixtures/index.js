'use strict'

const uuid = require('uuid-base62')

const fixtures = {
  getImage () {
    return {
      description: 'an #awesome picture with #tags #platzi',
      url: `http://platzigram.test/${uuid.v4()}.jpg`, // url de la imagen
      likes: 0,
      liked: false,
      userId: uuid.uuid()
    }
  },
  getImages (n) {
    let images = [] // tenemos un arreglo de imagenes
    while (n-- > 0) { // vamos a iterar hasta que el numero llegue a cero
      images.push(this.getImage()) // insertamos dentro del arreglo una imagen que vamos a obtener del objeto getimage
    }

    return images // retornamos el arreglo
  },
  getUser () {
    return {
      name: 'A random user',
      username: `user_${uuid.v4()}`, // nombre de usuario aleatorio
      password: uuid.uuid(), // password aleatorio
      email: `${uuid.v4()}@platzi.test` // correo aleatorio
    }
  }
}

module.exports = fixtures
