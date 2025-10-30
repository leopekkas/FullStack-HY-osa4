const mongoose = require('mongoose')
const app = require('./app')
const config = require('./utils/config')

console.log('connecting to', config.MONGODB_URI)

mongoose.connect(config.MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB')
    if (process.env.NODE_ENV !== 'test') {
      app.listen(config.PORT, () => {
        console.log(`Server running on port ${config.PORT}`)
      })
    }
    app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`)
    })
  })
  .catch((error) => {
    console.error('error connecting to MongoDB:', error.message)
  })
