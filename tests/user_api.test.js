require('dotenv').config()
const { test, describe, before, beforeEach, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const bcrypt = require('bcrypt')
const app = require('../app')
const User = require('../models/user')

const api = supertest(app)

before(async () => {
  await mongoose.connect(process.env.TEST_MONGODB_URI)
})

beforeEach(async () => {
  await User.deleteMany({})

  const passwordHash = await bcrypt.hash('sekret', 10)
  const user = new User({ username: 'root', passwordHash })
  await user.save()
})

after(async () => {
  await mongoose.connection.close()
})


test('creation succeeds with a fresh username', async () => {
  const usersAtStart = await User.find({})

  const newUser = {
    username: 'mluukkai',
    name: 'Matti Luukkainen',
    password: 'salasana123',
  }

  await api
    .post('/api/users')
    .send(newUser)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const usersAtEnd = await User.find({})
  assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

  const usernames = usersAtEnd.map(u => u.username)
  assert(usernames.includes(newUser.username))
})

test('creation fails with proper statuscode and message if username already taken', async () => {
  const usersAtStart = await User.find({})

  const newUser = {
    username: 'root',
    name: 'Superuser',
    password: 'salainen',
  }

  const result = await api
    .post('/api/users')
    .send(newUser)
    .expect(400)
    .expect('Content-Type', /application\/json/)

  assert(result.body.error.includes('username must be unique'))

  const usersAtEnd = await User.find({})
  assert.strictEqual(usersAtEnd.length, usersAtStart.length)
})

after(async () => {
  await mongoose.connection.close()
})

describe('invalid user creation', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })
    await user.save()
  })

  test('fails with status 400 if username is too short', async () => {
    const newUser = {
      username: 'ab', // liian lyhyt
      name: 'Too Short',
      password: 'validpass'
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)

    assert(result.body.error.includes('is shorter than the minimum allowed length'))
  })

  test('fails with status 400 if password is too short', async () => {
    const newUser = {
      username: 'validuser',
      name: 'Short Password',
      password: 'pw' // liian lyhyt
    }

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)

    assert(result.body.error.includes('password must be at least 3 characters long'))
  })

  after(async () => {
    await mongoose.connection.close()
  })
})
