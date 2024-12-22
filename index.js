// importing dotenv
require('dotenv').config()
// importing express
const express = require('express')
// importing cores
const cors = require('cors')
// importing mongodb
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');

// application port
const port = process.env.PORT || 5000
// importing express
const app = express()

// middlewares

// using cors middleware
// corsOptions for jwt
const corsOptions = {
  origin: [
    'http://localhost:5173'
  ],
  credentials: true,
  optionalSuccessStatus: 200,
}
app.use(cors(corsOptions))
// using express.json middleware
app.use(express.json())

// mongodb uri 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eeint.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    // backend functionality starts here

    // jwt
    app.post('/jwt', async (req, res) => {
      // taking user email to create token
      const email = req.body;
      // create token
      const token = jwt.sign(email, process.env.SECRET_KEY, { expiresIn: '5h' });
      console.log(token);
      // storing token to the cookie storage
      res.cookie('viewBlogToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      }).send({ success: true });
    })

    // logout and clear saved token from browser cookie
    app.get('/logout', async (req, res) => {
      res.clearCookie('viewBlogToken', {
        maxAge: 0,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      }).send({ success: true });
    })


    // Connect to the "BlogDB" database and access its "blogs" collection
    const database = client.db("BlogDB");
    const blogsCollection = database.collection("Blogs");


    // backed apis start here

    // get all blogs
    app.get('/blogs', async (req, res) => {
      const result = await blogsCollection.find().toArray();
      res.send(result);
    })

    // add blog to the blogs collection
    app.post('/add-blog', async (req, res) => {
      const blog = req.body;
      const result = await blogsCollection.insertOne(blog);
      res.send(result);
    })










    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 })
    // console.log(
    //   'Pinged your deployment. You successfully connected to MongoDB!'
    // )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from Project Server....')
})
app.listen(port, () => console.log(`Server running on port ${port}`))
