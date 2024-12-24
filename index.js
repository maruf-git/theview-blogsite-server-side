// importing dotenv
require('dotenv').config()
// importing express
const express = require('express')
// importing cores
const cors = require('cors')
// importing mongodb
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// jwt
const jwt = require('jsonwebtoken');

// application port
const port = process.env.PORT || 5000
// importing express
const app = express()
// importing cookie parser
const cookieParser = require('cookie-parser');

// middlewares

// authentication middleware
const verifyToken = async (req, res, next) => {
  // console.log(req.cookies);
  const tokenFromClient = req.cookies?.viewBlogToken;
  // console.log('token from client:',tokenFromClient)
  // no token found check
  if (!tokenFromClient) return res.status(401).send({ message: 'unauthorized access!' });
  // invalid token check
  jwt.verify(tokenFromClient, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      // console.log("decode error",err)
      res.invalidToken = true;
      return res.status(401).send({ message: 'unauthorized access!' });
    }
    req.user = decoded;
    // console.log(req.user);
  })
  next();
}

// corsOptions for jwt
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true,
  optionalSuccessStatus: 200,
}
// using cors middleware
app.use(cors(corsOptions))
// using express.json middleware
app.use(express.json())
// using cookie parser
app.use(cookieParser());

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
      // console.log(token);
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
    // creating blogs collection
    const blogsCollection = database.collection("Blogs");
    // creating comments collection
    const commentsCollection = database.collection("Comments");



    // backed apis start here

    // get all blogs
    app.get('/blogs', async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      let query = {
        title: {
          $regex: search,
          $options: 'i',
        },
      }
      if (filter) {
        query.category = filter
      }
      const result = await blogsCollection.find(query).toArray();
      res.send(result);
    })

    // get specific blog by id
    // verifyToken,
    app.get('/blogs/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(filter);
      res.send(result);

    })

    // get featured blogs(top 10 blogs with max description)
    app.get('/featured-blogs', async (req, res) => {
      const filter = {};
      const result = await blogsCollection.find(filter).limit(2).sort({ 'length': -1 }).toArray();
      res.send(result);

    })


    // add blog to the blogs collection
    // verifyToken,
    app.post('/add-blog', verifyToken, async (req, res) => {
      // invalid token checking extra layer 
      if (req?.invalidToken) {
        console.log("invalid token user")
        res.send({ message: 'Your token is invalid' });
      }
      else {
        const blog = req.body;
        const result = await blogsCollection.insertOne(blog);
        res.send(result);
      }
    })

    // update blog by id
    app.patch('/update-blog/:id', async (req, res) => {
      const id = req.params.id;
      const blog = req.body;
      const { title, category, short_des, description, image } = blog;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          title,
          category,
          image,
          description,
          short_des
        },
      }
      const result = await blogsCollection.updateOne(filter, updateDoc)
      res.send(result);
    })



    // get all comments on specific blog_id
    app.get('/comments/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { blog_id: id };
      const result = await commentsCollection.find(filter).toArray();
      res.send(result);
    })

    // add comment to the comments collection
    // verifyToken,
    app.post('/add-comment', async (req, res) => {
      const comment = req.body;
      const result = await commentsCollection.insertOne(comment);
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
