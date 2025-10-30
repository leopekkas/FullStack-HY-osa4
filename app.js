const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const Blog = require('./models/blog')
const User = require('./models/user')

const app = express()
app.use(express.json())

app.get('/api/blogs', async (request, response) => {
  const blogs = await Blog.find({})
  response.json(blogs)
})

app.post('/api/blogs', async (request, response, next) => {
  try {
    const body = request.body

    const blog = new Blog(body)
    const savedBlog = await blog.save()
    response.status(201).json(savedBlog)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/blogs/:id', async (request, response, next) => {
  try {
    const { id } = request.params
    await Blog.findByIdAndDelete(id)
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.put('/api/blogs/:id', async (request, response, next) => {
  try {
    const { id } = request.params
    const body = request.body

    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      { likes: body.likes },
      { new: true, runValidators: true, context: 'query' }
    )

    if (updatedBlog) {
      response.json(updatedBlog)
    } else {
      response.status(404).end()
    }
  } catch (error) {
    next(error)
  }
})

app.get('/api/users', async (request, response) => {
  const users = await User.find({})
  response.json(users)
})

app.post('/api/users', async (request, response, next) => {
  try {
    const { username, name, password } = request.body

    if (!password || password.length < 3) {
      return response.status(400).json({
        error: 'password must be at least 3 characters long'
      })
    }

    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const user = new User({
      username,
      name,
      passwordHash,
    })

    const savedUser = await user.save()
    response.status(201).json(savedUser)
  } catch (error) {
    next(error)
  }
})

app.use((error, request, response, next) => {
  console.error('Error name:', error.name)
  console.error('Error message:', error.message)

  if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } else if (error.name === 'CastError') {
    return response.status(400).json({ error: 'malformatted id' })
  } else if (error.name === 'MongoServerError' && error.message.includes('E11000')) {
    return response.status(400).json({ error: 'username must be unique' })
  }

  return response.status(500).json({ error: 'internal server error' })
})

module.exports = app
