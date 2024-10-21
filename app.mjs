import Datastore from "nedb";
import multer from "multer";
import { compare, genSalt, hash } from "bcrypt";
import { resolve, join } from "path";
import { createServer } from "http";
import express from "express";
import fs from 'fs';
import session from "express-session";
import { serialize } from "cookie";
import { body, param, validationResult } from 'express-validator';

const PORT = 3000;

const app = express();

let users = new Datastore({ filename: 'db/users.db', autoload: true });
let comments = new Datastore({ filename: 'db/comments.db', autoload: true, timestampData : true})
let images = new Datastore({ filename: 'db/images.db', autoload: true, timestampData : true})

const upload = multer({ dest: resolve('uploads/') });

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(express.static("static"));

app.use(session({
  secret: 'please change this secret',
  resave: false,
  saveUninitialized: true,
}));

app.use(function(req, res, next){
  const username = (req.session.user)? req.session.user._id : '';
  res.setHeader('Set-Cookie', serialize('username', username, {
        path : '/', 
        maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
  }));
  next();
});

function isAuthenticated(req, res, next) {
  if (!req.session.user) return res.status(401).end("access denied");
  next();
};

app.use(function (req, res, next) {
  console.log("HTTP request", req.method, req.url, req.body);
  next();
});

const sanitizeContent = [
  body('content').exists().escape().withMessage('Content is required'),
];

const Comment = function (message) {
  this.author = message.author;
  this.content = message.content;
  this.date = message.date;
  this.imageId  = message.imageId;
};

app.post("/api/signup/", function (req, res, next) {
  // extract data from HTTP request
  if (!('username' in req.body)) return res.status(400).end('username is missing');
  if (!('password' in req.body)) return res.status(400).end('password is missing');
  var username = req.body.username;
  var password = req.body.password;
  // check if user already exists in the database
  users.findOne({_id: username}, function(err, user){
      if (err) return res.status(500).end(err);
      if (user) return res.status(409).end("username " + username + " already exists");
      // generate a new salt and hash
      genSalt(10, function(err, salt) {
          hash(password, salt, function(err, hash) {
              // insert new user into the database
              users.update({_id: username},{_id: username, hash: hash, createdAt: new Date() }, {upsert: true}, function(err){
                  if (err) return res.status(500).end(err);
                  return res.status(201).json({ username });
              });
          });
      });
  });
});

app.post("/api/signin/", function (req, res, next) {
  // extract data from HTTP request
  if (!('username' in req.body)) return res.status(400).end('username is missing');
  if (!('password' in req.body)) return res.status(400).end('password is missing');
  var username = req.body.username;
  var password = req.body.password;
  // retrieve user from the database
  users.findOne({_id: username}, function(err, user){
      if (err) return res.status(500).end(err);
      if (!user) return res.status(401).end("access denied");
      compare(password, user.hash, function(err, valid) {
         if (err) return res.status(500).end(err);
         if (!valid) return res.status(401).end("access denied");
         // start a session
         req.session.user = user;
         res.setHeader('Set-Cookie', serialize('username', user._id, {
               path : '/', 
               maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
         }));
        return res.status(201).json({ message: 'Sign-in successful' }); 

      });
  });
});

app.get("/api/signout/", function(req, res, next){
  req.session.destroy();
  res.setHeader('Set-Cookie', serialize('username', '', {
        path : '/', 
        maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
  }));
  return res.status(201).json({ message: 'Sign-out successful' });
});

// Create
app.post("/api/users/:userId/images/", isAuthenticated, upload.single("image"), function (req, res, next) {
  const newImage = { title: req.body.title, author: req.params.userId, path: req.file.path, mimetype: req.file.mimetype };
  images.insert(newImage, function (err, image) {
    if (err) return res.status(500).end(err.message);
    users.update(
      { _id: req.params.userId },
      { $set: { image: image._id } }, // Add this key-value pair
      function (err) {
        if (err) return res.status(500).end(err.message);
        return res.status(201).json(image); 
      });
  });
});

app.post('/api/images/:imageId/comments/', sanitizeContent, isAuthenticated, function (req, res) {
  const imageId = req.params.imageId;
  const comment = new Comment({ author: req.session.user._id, content: req.body.content, date: req.body.date, imageId: imageId });

  comments.insert(comment, function (err, newComment) {
    if (err) return res.status(500).end(err.message);
    return res.status(201).json(newComment);
  });
});

// Read
app.get("/api/users/", function (req, res) {
  const page = parseInt(req.query.page) || 0;
  const limit = Math.max(6, parseInt(req.query.limit) || 6);
  const skip = page * limit; 

  users.find({}, function (err, allUsers) {
    if (err) return res.status(500).end(err.message);

    users.find({})
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .exec(function (err, users) {
        if (err) return res.status(500).end(err.message);

        return res.json({
          users_array: users,
          total: allUsers.length,
          page: page,
          limit: limit,
        });
      });
  });
});



app.get("/api/users/:userId/images/", function (req, res) {
  images.find({ author: req.params.userId }, function (err, images) {
    if (err) return res.status(500).end(err.message);
    return res.json(images);
  });
});

app.get('/api/images/:imageId/comments/', function (req, res) {
  const imageId = req.params.imageId;
  const page = parseInt(req.query.page) || 0;
  const limit = 10;
  const skip = page * limit;

  comments.find({ imageId: imageId })
    .sort({ createdAt: -1 }) // Sort by creation date
    .skip(skip)
    .limit(limit)
    .exec(function (err, comments) {
      if (err) return res.status(500).end(err.message);
      return res.json(comments);
    });
});

app.get('/api/images/:imageId/', function (req, res) {
  const imageId = req.params.imageId;
  images.findOne({ _id: imageId }, function (err, image) {
    if (err) {
      return res.status(500).end(err.message);
    }
    if (!image) {
      return res.status(404).end("Image with ID " + imageId + " does not exist");
    }

    res.setHeader("Content-Type", image.mimetype);
    res.sendFile(image.path);
  });
});

// Update


// Delete
app.delete("/api/images/:imageId/comments/:commentId", isAuthenticated, function (req, res) {
  comments.findOne({ _id: req.params.commentId }, function (err, comment) {
    if (err) return res.status(500).end(err);
    if (!comment)
      return res.status(404).end("Message id #" + req.params.id + " does not exist");

    images.findOne({ _id: req.params.imageId }, function (err, image) {
      if (err) return res.status(500).end(err.message);
      if (!image) {
        return res.status(404).end("Image id #" + req.params.imageId + " does not exist");
      }

      if (comment.author !== req.session.user._id && image.author !== req.session.user._id) {
        return res.status(403).end("Access denied: You do not own this comment or the image");
      }

      comments.remove({ _id: req.params.commentId }, { multi: false }, function (err, num) {
        if (err) return res.status(500).end(err.message);
        if (num === 0) return res.status(404).json({ error: "Comment not found" });
        return res.json(comment);
      });
    });
  })
});

app.delete("/api/images/:id", isAuthenticated, function (req, res, next) {
  images.findOne({ _id: req.params.id }, function (err, image) {
    if (err) return res.status(500).end(err);
    if (!image) return res.status(404).end("Image id #" + req.params.id + " does not exist");

    if (image.author !== req.session.user._id) {
      return res.status(403).end("Access denied: You do not own this image");
    }

    comments.remove({ imageId: req.params.id }, { multi: true }, function (err) {
      if (err) return res.status(500).end("Error deleting comments");

      // Now delete the image file
      fs.unlink(resolve('uploads', image.path), function (err) {
        if (err) return res.status(500).end("Error deleting file");

        // Finally, remove the image from the database
        images.remove({ _id: req.params.id }, { multi: false }, function (err, num) {
          if (err) return res.status(500).end(err);
          if (num === 0) return res.status(404).json({ error: "Image not found" });
          
          return res.json(image);
        });
      });
    });
  })
});

// This is for testing purpose only
export function createTestDb(db) {
  images = new Datastore({ filename: join("testdb", "images.db"), autoload: true, timestampData : true});
  comments = new Datastore({ filename: join("testdb", "comments.db"), autoload: true, timestampData : true});
  users = new Datastore({ filename: join("testdb", "users.db"), autoload: true, timestampData : true});
}

// This is for testing purpose only
export function deleteTestDb(db) {
  fs.rmSync("testdb", { recursive: true, force: true });
}

// This is for testing purpose only
export function getImages(callback) {
  return images
    .find({})
    .sort({ createdAt: -1 })
    .exec(function (err, users) {
      if (err) return callback(err, null);
      return callback(err, users.reverse());
    });
}

// This is for testing purpose only
export function getComments(callback) {
  return comments
    .find({})
    .sort({ createdAt: -1 })
    .exec(function (err, users) {
      if (err) return callback(err, null);
      return callback(err, users.reverse());
    });
}

// This is for testing purpose only
export function getUsers(callback) {
  return users
    .find({})
    .sort({ createdAt: -1 })
    .exec(function (err, users) {
      if (err) return callback(err, null);
      return callback(err, users.reverse());
    });
}

export const server = createServer(app).listen(PORT, function (err) {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});
