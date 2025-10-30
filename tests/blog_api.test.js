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

test('a valid blog can be added', async () => {
  const newBlog = {
    title: 'New Blog from Test',
    author: 'Leo',
    url: 'http://testblog.com',
    likes: 7,
  }

  const blogsAtStart = await Blog.find({})

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const blogsAtEnd = await Blog.find({})
  assert.strictEqual(blogsAtEnd.length, blogsAtStart.length + 1)

  const titles = blogsAtEnd.map((b) => b.title)
  assert.ok(titles.includes('New Blog from Test'))
})

test('unique identifier property of blogs is named id', async () => {
  const response = await api.get('/api/blogs')
  const blogs = response.body

  for (const blog of blogs) {
    assert.ok(blog.id)
    assert.strictEqual(blog._id, undefined)
  }
})

test('if likes property is missing from request, it will default to 0', async () => {
  const newBlog = {
    title: 'Blog without likes',
    author: 'Leo',
    url: 'http://nolikes.com',
  }

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const blogsAtEnd = await Blog.find({})
  const addedBlog = blogsAtEnd.find((b) => b.title === 'Blog without likes')

  assert.strictEqual(addedBlog.likes, 0)
})

test('blog without title is not added', async () => {
  const newBlog = {
    author: 'Author without title',
    url: 'http://notitle.com',
    likes: 2,
  }

  const blogsAtStart = await Blog.find({})

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(400)

  const blogsAtEnd = await Blog.find({})
  assert.strictEqual(blogsAtEnd.length, blogsAtStart.length)
})

test('blog without url is not added', async () => {
  const newBlog = {
    title: 'No URL Blog',
    author: 'Author without url',
    likes: 3,
  }

  const blogsAtStart = await Blog.find({})

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(400)

  const blogsAtEnd = await Blog.find({})
  assert.strictEqual(blogsAtEnd.length, blogsAtStart.length)
})

test('a blog can be deleted', async () => {
  const blogsAtStart = await Blog.find({})
  const blogToDelete = blogsAtStart[0]

  await api
    .delete(`/api/blogs/${blogToDelete.id}`)
    .expect(204)

  const blogsAtEnd = await Blog.find({})
  assert.strictEqual(blogsAtEnd.length, blogsAtStart.length - 1)

  const ids = blogsAtEnd.map(b => b.id)
  assert(!ids.includes(blogToDelete.id))
})

test('a blog\'s likes can be updated', async () => {
  const blogsAtStart = await Blog.find({})
  const blogToUpdate = blogsAtStart[0]

  const updatedData = {
    likes: blogToUpdate.likes + 10
  }

  const response = await api
    .put(`/api/blogs/${blogToUpdate.id}`)
    .send(updatedData)
    .expect(200)
    .expect('Content-Type', /application\/json/)

  assert.strictEqual(response.body.likes, blogToUpdate.likes + 10)

  const blogAfter = await Blog.findById(blogToUpdate.id)
  assert.strictEqual(blogAfter.likes, blogToUpdate.likes + 10)
})
