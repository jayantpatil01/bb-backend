const express = require('express');
const cors  = require('cors')
const mongoose = require('mongoose');
require('dotenv').config()
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const userRoutes = require('./routes/userRoutes'); 
const postRoutes = require('./routes/postRoutes');
const upload = require('express-fileupload') 

const app = express();

// Middleware for parsing JSON and URL-encoded data
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({credentials:true , origin:"http://localhost:3000"}));
app.use(upload())
app.use('/uploads' , express.static(__dirname + '/uploads'))

// Use your routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// Error handling middleware should be placed after route handlers
app.use(notFound);
app.use(errorHandler);

// Start the server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Start the server after successful database connection
    app.listen(5000, () =>
      console.log(`Server started at port ${process.env.PORT || 5000}`)
    );
  })
  .catch((error) => console.log(error));
