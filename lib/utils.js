'use strict'

import jwt from 'jsonwebtoken'
import bearer from 'token-extractor'

export default {
  // metodo para generar o firmar el token
  async signToken (payload, secret, options) {
    return new Promise((resolve, reject) => {
      jwt.sign(payload, secret, options, (err, token) => { // callback
        if (err) return reject(err)

        resolve(token)
      })
    })
  },

  // metodo para verificar el token
  async verifyToken (token, secret, options) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, secret, options, (err, decoded) => {
        if (err) return reject(err)

        resolve(decoded)
      })
    })
  },

  // metodo para extraer el token de la peticion HTTP
  async extractToken (req) {
    // Authorization: Bearer <token>
    return new Promise((resolve, reject) => {
      bearer(req, (err, token) => {
        if (err) return reject(err)

        resolve(token)
      })
    })
  }
}
