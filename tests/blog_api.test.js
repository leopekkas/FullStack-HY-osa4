require('dotenv').config()
const { test, describe, before, beforeEach, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const Blog = require('../models/blog')

console.log('TEST ENVIRONMENT:', process.env.NODE_ENV)
console.log('USING DB:', process.env.TEST_MONGODB_URI)

const api = supertest(app)

const initialBlogs = [
  {
    title: 'First blog',
    author: 'Test Author',
    url: 'http://example.com',
    likes: 3,
  },
  {
    title: 'Second blog',
    author: 'Tester',
    url: 'http://example2.com',
    likes: 5,
  },
]

before(async () => {
  await mongoose.connect(process.env.TEST_MONGODB_URI)
})

beforeEach(async () => {
  await Blog.deleteMany({})
  await Blog.insertMany(initialBlogs)
})

after(async () => {
  await mongoose.connection.close()
})

test('blogs are returned as json and correct amount', async () => {
  const response = await api
    .get('/api/blogs')
    .expect(200)
    .expect('Content-Type', /application\/json/)

  assert.strictEqual(response.body.length, initialBlogs.length)
})

test('unique identifier property of blogs is named id', async () => {
  const response = await api.get('/api/blogs')
  const blogs = response.body

  for (const blog of blogs) {
    assert.ok(blog.id)
    assert.strictEqual(blog._id, undefined)
  }
})
