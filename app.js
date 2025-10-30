const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const Blog = require('./models/blog')
const User = require('./models/user')

const usersRouter = require('./controllers/users')
const loginRouter = require('./controllers/login')

const { tokenExtractor } = require('./utils/middleware')

const app = express()
app.use(express.json())
app.use(tokenExtractor)

app.use('/api/users', usersRouter)
app.use('/api/login', loginRouter)

app.get('/api/blogs', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
  response.json(blogs)
})

app.post('/api/blogs', async (request, response, next) => {
  try {
    const body = request.body

    const decodedToken = jwt.verify(request.token, process.env.SECRET)
    if (!decodedToken.id) {
      return response.status(401).json({ error: 'token invalid' })
    }

    const user = await User.findById(decodedToken.id)
    if (!user) {
      return response.status(404).json({ error: 'user not found' })
    }

    const blog = new Blog({
      title: body.title,
      author: body.author,
      url: body.url,
      likes: body.likes || 0,
      user: user._id
    })

    const savedBlog = await blog.save()

    user.blogs = user.blogs.concat(savedBlog._id)
    await user.save()

    response.status(201).json(savedBlog)
  } catch (error) {
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    next(error)
  }
})

app.delete('/api/blogs/:id', async (request, response, next) => {
  try {
    const decodedToken = jwt.verify(request.token, process.env.SECRET)
    if (!decodedToken.id) {
      return response.status(401).json({ error: 'token missing or invalid' })
    }

    const user = await User.findById(decodedToken.id)
    const blog = await Blog.findById(request.params.id)
    if (!blog) {
      return response.status(404).json({ error: 'blog not found' })
    }

    if (blog.user.toString() !== decodedToken.id.toString()) {
      return response.status(403).json({ error: 'unauthorized: cannot delete others blogs' })
    }

    await Blog.findByIdAndDelete(request.params.id)
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

    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return response.status(400).json({
        error: 'expected `username` to be unique',
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

const blogsRouter = require('./controllers/blogs')
app.use('/api/blogs', blogsRouter)
