import { use, expect } from 'chai';
import chaiHttp from 'chai-http';
import { readFileSync } from "fs";
import path from 'path';

import { server, createTestDb, deleteTestDb,  getImages, getComments, getUsers } from "../app.mjs";

const chai = use(chaiHttp);


describe("Testing Static Files", () => {
  after(function () {
    server.close();
  });

  it("it should get index.html", function (done) {
    chai
      .request.execute(server)
      .get("/")
      .end(function (err, res) {
        expect(res).to.have.status(200);
        expect(res.text).to.be.equal(
          readFileSync("./static/index.html", "utf-8"),
        );
        done();
      });
  });
});

let imageId_1, imageId_2;
let commentId_1, commentId_2; 

describe("Testing API", () => {
  let agent;
  const testImage = {
    title: "Test Image",
    author: "Test Author",
    path: path.resolve("./test/test_images/1_Mora.png")
  };
  const testComment_1 = {
    author: "Comment Author",
    content: "This is a test comment",
    date: new Date().toISOString()
  }
  const testComment_2 = {
    author: "Emily",
    content: "Im trying :(",
    date: new Date().toISOString()
  }

  const testUser_1 = {
    username: "testuser1",
    password: "password123"
  };
  const testUser_2 = {
    username: "testuser2",
    password: "password123"
  };

  before(function () {
    agent = chai.request.agent(server);
    createTestDb();
  });

  after(function () {
    deleteTestDb();
    agent.close();
  });

  it("it should signup a new user", function (done) {
    agent
      .post("/api/signup/")
      .send(testUser_1)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res).to.have.status(201);
        getUsers(function (err, users) {
          if (err) return done(err);
          expect(users).to.have.length(1);
          expect(users[0]).to.have.property("_id", "testuser1");
          done();
        });
      });
  });

  it("it should sign in a user", function (done) {
    agent
      .post("/api/signin/")
      .send({ username: "testuser1", password: "password123" })
      .end(function (err, res) {
        expect(res).to.have.status(201);
        done();
      });
  });

  it("it should add an image", function (done) {
    agent
      .post("/api/users/testuser1/images")
      .set("content-type", "multipart/form-data")
      .field('title', testImage.title)
      .field('author', testImage.author)
      .attach('image', readFileSync(testImage.path), '1_Mora.png')
      .end(function (err, res) {
        console.log("Response body:", res.body); 

        if (err) {
          console.error(err);
          return done(err);
        }
        expect(res).to.have.status(201);
        expect(res.body).to.have.property("title", testImage.title);
        expect(res.body).to.have.property("author", testUser_1.username);
        expect(res.body).to.have.property("path");
        expect(res.body).to.have.property("mimetype"); 
        imageId_1 = res.body._id;  
        getImages(function (err, items) {
          if (err) return done(err);
          expect(items).to.have.length(1);
          done();
        });
      });
  });

  it("it should add another image", function (done) {
    agent
      .post("/api/users/testuser1/images")
      .set("content-type", "multipart/form-data")
      .field('title', testImage.title)
      .field('author', testImage.author)
      .attach('image', readFileSync(testImage.path), '1_Mora.png')
      .end(function (err, res) {
        console.log("Response body:", res.body); 

        if (err) {
          console.error(err);
          return done(err);
        }
        expect(res).to.have.status(201);
        expect(res.body).to.have.property("title", testImage.title);
        expect(res.body).to.have.property("author", testUser_1.username);
        expect(res.body).to.have.property("path");
        expect(res.body).to.have.property("mimetype"); 
        imageId_2 = res.body._id;  
        getImages(function (err, items) {
          if (err) return done(err);
          expect(items).to.have.length(2);
          done();
        });
      });
  });

  it("it should get all images", function (done) {
    agent.get("/api/users/testuser1/images").end(function (err, res) {
      expect(res).to.have.status(200);
      expect(res.body[0]).to.have.property("title", testImage.title);
      expect(res.body[1]).to.have.property("title", testImage.title);
      done();
    });
  });

  it("it should get the first image", function (done) {
    agent.get(`/api/images/${imageId_1}`).end(function (err, res) {
      expect(res).to.have.status(200);
      expect(res).to.have.header("Content-Type", "image/png"); 
      done();
    });
  });

  it("it should add a comment to first image", function (done) {
    agent
      .post(`/api/images/${imageId_1}/comments`)
      .send(testComment_1)
      .end(function (err, res) {
        console.log("Response body:", res.body); 
        console.log("Response body:", testImage); 

        expect(res).to.have.status(201);
        expect(res.body).to.have.property("author", testUser_1.username);
        expect(res.body).to.have.property("content", "This is a test comment");
        expect(res.body).to.have.property("imageId", imageId_1);
        commentId_1 = res.body._id;
        done();
      });
  });

  it("it should add another comment to first image", function (done) {
    agent
      .post(`/api/images/${imageId_1}/comments`)
      .send(testComment_2)
      .end(function (err, res) {
        console.log("Response body:", res.body); 
        console.log("Response body:", testImage); 

        expect(res).to.have.status(201);
        expect(res.body).to.have.property("author", testUser_1.username);
        expect(res.body).to.have.property("content", testComment_2.content);
        expect(res.body).to.have.property("imageId", imageId_1);
        commentId_2 = res.body._id;
        done();
      });
  });

  it("it should fetch comments for an image", function (done) {
    agent
      .get(`/api/images/${imageId_1}/comments`)
      .query({ page: 0 }) // pagination
      .end(function (err, res) {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an("array").that.has.lengthOf(2);
        expect(res.body[0]).to.have.property("author", testUser_1.username);
        expect(res.body[0]).to.have.property("content", testComment_2.content);
        expect(res.body[0]).to.have.property("imageId", imageId_1);
        expect(res.body[0]).to.have.property("_id", commentId_2);

        expect(res.body[1]).to.have.property("author", testUser_1.username);
        expect(res.body[1]).to.have.property("content", testComment_1.content);
        expect(res.body[1]).to.have.property("imageId", imageId_1);
        expect(res.body[1]).to.have.property("_id", commentId_1);
        done();
      });
  });

  it("it should delete the previously added first comment", function (done) {
    agent
      .delete(`/api/images/${imageId_1}/comments/${commentId_1}`)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("author", testUser_1.username);
        done();
      });
  });

  it("it should delete the second image", function (done) {
    agent
      .delete(`/api/images/${imageId_2}`)
      .end(function (err, res) {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("title", testImage.title);
        done();
      });
  });

  it("it should sign out a user", function (done) {
    agent.get("/api/signout/").end(function (err, res) {
      expect(res).to.have.status(201);
      done();
    });
  });

  it("it should signup another new user", function (done) {
    agent
      .post("/api/signup/")
      .send(testUser_2)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res).to.have.status(201);
        getUsers(function (err, users) {
          if (err) return done(err);
          expect(users).to.have.length(2);
          expect(users[1]).to.have.property("_id", "testuser2");
          done();
        });
      });
  });

  it("it should  NOT delete the previously added second comment", function (done) {
    agent
      .delete(`/api/images/${imageId_1}/comments/${commentId_2}`)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res).to.have.status(401);
        expect(res.text).to.equal("access denied");
        done();
      });
  });

  it("it should NOT delete the first image", function (done) {
    agent
      .delete(`/api/images/${imageId_1}`)
      .end(function (err, res) {
        expect(res).to.have.status(401);
        expect(res.text).to.equal("access denied");
        done();
      });
  });

  it("it should sign out a user", function (done) {
    agent.get("/api/signout/").end(function (err, res) {
      expect(res).to.have.status(201);
      done();
    });
  });

  it("it should sign in first user", function (done) {
    agent
      .post("/api/signin/")
      .send({ username: "testuser1", password: "password123" })
      .end(function (err, res) {
        expect(res).to.have.status(201);
        done();
      });
  });

  it("it should delete the previously added second comment", function (done) {
    agent
      .delete(`/api/images/${imageId_1}/comments/${commentId_2}`)
      .end(function (err, res) {
        if (err) return done(err);
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("author", testUser_1.username);
        done();
      });
  });

  it("it should delete the first image", function (done) {
    agent
      .delete(`/api/images/${imageId_1}`)
      .end(function (err, res) {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("title", testImage.title);
        done();
      });
  });

  it("it should sign out a user", function (done) {
    agent.get("/api/signout/").end(function (err, res) {
      expect(res).to.have.status(201);
      done();
    });
  });
});
