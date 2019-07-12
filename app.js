// ---Comment-----
const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;
// ---------------

const express       = require("express"),
      app           = express(),
      bodyParser    = require("body-parser"),
      path          = require('path'),
      mongoose      = require("mongoose"),
      passport      = require("passport"),
      LocalStrategy = require("passport-local"),
      flash         = require("connect-flash"),
      Topic         = require("./models/topic"),
      Blog          = require("./models/blog"),
      Comment       = require("./models/comment"),
      User          = require("./models/user"),
      session       = require("express-session"),
      request       = require("request"),
      methodOverride = require("method-override");
// ---- Switch -------
// mongoose.connect("mongodb://Gary:Montes1Blog@ds211724.mlab.com:11724/montesblog");
mongoose.connect("mongodb://localhost/first_blog");
// -------------------
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride('_method'));
app.use(flash());

// PASSPORT CONFIGURATION
app.use(require("express-session")({
   secret: "Monte is the man",
   resave: false,
   saveUninitialized: false
}));


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
   cookie: { secure: true }
   res.locals.currentUser = req.user;
   res.locals.success = req.flash('success');
   res.locals.error = req.flash('error');
   next();
});

//  Landing Page
app.get('/', function (req, res){
  res.render('home');
});

app.get('/about', function (req, res){
  res.render('about');
});

// ============
//    User
// ============
//  show sign up form
app.get('/signup', function(req, res){
  res.render('register');
});
//  Submit regi form
app.post('/signup', function(req, res){
  var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            req.flash("error", err.message);
            return res.render("register");
        }
        passport.authenticate("local")(req, res, function(){
           req.flash("success", "Successfully Signed Up! Nice to meet you " + req.body.username);
           res.redirect("/topics");
        });
    });
});
// show login form
app.get('/login', function(req, res){
  res.render('login');
})
//   Submit login form
app.post("/login", passport.authenticate("local",
    {
        successRedirect: "/topics",
        failureRedirect: "/login"
    }), function(req, res){
});
//  Logout
app.get('/logout', function(req, res){
  req.logout();
  req.flash("success", "LOGGED YOU OUT!");
  res.redirect('/')
})

// ============
//  Topic
// ============
//  show topic create form
app.get('/topics/new',isLoggedin, function(req, res){
  res.render('topics/new');
});
//  submit new topic form
app.post('/topics',isLoggedin, function(req, res){
  Topic.create(req.body.topic, function(err, newlyCreated){
    if (err){
      console.log(err);
    }else{
      console.log(newlyCreated);
      res.redirect('/topics');
    };
  });
});
// show all topics
app.get('/topics',isLoggedin, function(req, res){
  Topic.find({}, function(err,allTopics){
    if (err){
      console.log(err);
    }else{
      res.render('topics/index', {topics: allTopics});
    };
  });
});
// show topic
app.get('/topics/:id',isLoggedin, function(req, res){
  Topic.findById(req.params.id).populate("blogs").exec(function(err, topic){
    if (err){
      console.log(err);
    }else{
      Blog.find({}, function(err, allBlogs){
        if(err){
          console.log(err);
        }else {
          res.render('topics/show', {topic: topic, blogs: allBlogs});
        };
      });
    };
  });
});

// ===========
//   Blogs
// ===========
//NEW - show form to create new blog
app.get("/topics/:id/blogs/new",isLoggedin, function(req, res){
  Topic.findById(req.params.id, function(err, topic){
    if(err){
      console.log(err);
    }else{
      res.render("blogs/new",{topic:topic});
    };
  });
});
//CREATE sumbit new blog
app.post("/topics/:id/blogs", isLoggedin, function(req, res){
    // get data from form and add to campgrounds array
    Topic.findById(req.params.id, function(err, topic){
      if (err){
        console.log(err);
      }else {
        Blog.create(req.body.blog, function(err, newBlog){
          if(err){
            console.log(err);
          }else{
            newBlog.author.id = req.user._id;
            newBlog.author.username = req.user.username;
            //save blog
            newBlog.save();
            topic.blogs.push(newBlog);
            topic.save();
            console.log(newBlog);
            req.flash('success', 'Created a blog!');
            res.redirect('/topics/'+topic._id+'/blogs/'+newBlog._id);
          };
        });
      };
    });
  });
  //  show individual blog
  app.get('/topics/:id/blogs/:blogId',isLoggedin, function(req, res){
    Topic.findById(req.params.id, function(err, topic){
      if (err){
        console.log(err);
      }else{
        Blog.findById(req.params.blogId).populate("comments").exec(function(err, foundBlog){
          if (err) {
            console.log(err);
          }else{
            res.render('blogs/show', {topic: topic, blog: foundBlog})
          };
        });
      };
    });
  });
// Edit
app.get('/topics/:id/blogs/:blogId/edit',isLoggedin, function(req, res){
  Topic.findById(req.params.id, function(err, topic){
    if(err){
      console.log(err);
    }else {
      Blog.findById(req.params.blogId, function(err, foundBlog){
        if (err){
          console.log(err);
        } else{
          console.log(foundBlog);
          res.render('blogs/edit', {topic: topic, blog: foundBlog});
        }
      })
    }
  })
})
// submit EDIT
app.put('/topics/:id/blogs/:blogId',isLoggedin, function(req, res){
  var newData = {title: req.body.title, image: req.body.image, content: req.body.content};
  Topic.findById(req.params.id, function(err, topic){
    if (err){
      console.log(err);
    }else {
      Blog.findByIdAndUpdate(req.params.blogId, {$set: newData}, function(err, blog){
        if (err){
          console.log(err);
        }else{
          res.redirect('/topics/'+topic._id+'/blogs/'+blog._id)
        };
      });
    }
  });
});
//  Delete form and remove blog
app.delete('/topics/:id/blogs/:blogId',isLoggedin, function (req, res){
    Topic.findById(req.params.id, function(err, topic){
      if (err){
        console.log(err);
      }else{
        Blog.findByIdAndRemove(req.params.blogId, function(err){
          if (err){
            console.log('Something went wrong');
          }else{
            res.redirect('/topics/'+topic._id);
          };
        });
      };
    });
});


// ==========
//  Comments
// ==========
// create comment form
app.get('/topics/:id/blogs/:blogId/comments/new',isLoggedin, function(req, res){
  Topic.findById(req.params.id, function(err, topic){
    if (err){
      console.log(err);
    }else {
      Blog.findById(req.params.blogId, function(err, blog){
        if(err){
          console.log(err);
        }else{
          res.render('comments/new', {topic:topic, blog: blog});
        };
      });
    };
  });
});

app.post('/topics/:id/blogs/:blogId/comments',isLoggedin, function(req, res){
  Topic.findById(req.params.id, function(err, topic){
    if (err){
      console.log(err);
    }else {
      Blog.findById(req.params.blogId, function(err, blog){
        if (err){
          console.log(err);
        }else {
          Comment.create(req.body.comment, function(err, comment){
            if(err){
              console.log(err);
            }else{
              comment.author.id = req.user._id;
              comment.author.username = req.user.username;
              comment.save();
              blog.comments.push(comment);
              blog.save();
              console.log(comment);
              req.flash('success', 'Created a comment!');
              res.redirect('/topics/'+topic._id+'/blogs/'+blog._id);
            };
          });
        };
      });
    };
  });
});
// get edit form
app.get('/topics/:id/blogs/:blogId/comments/:commId/edit',isLoggedin, function(req, res){
  Topic.findById(req.params.id, function(err, topic){
    if(err){
      console.log(err);
    }else{
      Blog.findById(req.params.blogId, function(err,blog){
        if(err){
          console.log(err);
        }else {
          Comment.findById(req.params.commId, function(err, comment){
            if(err){
              console.log(err);
            }else {
              res.render('comments/edit', {topic: topic, blog: blog, comment: comment});
            };
          });
        };
      });
    };
  });
});
// PUT submit edit form
app.put('/topics/:id/blogs/:blogId/comments/:commId',isLoggedin, function(req, res){
  var newData = {text: req.body.text}
  Topic.findById(req.params.id, function(err, topic){
    if (err){
      console.log(err);
    }else{
      Blog.findById(req.params.blogId, function(err, blog){
        if (err){
          console.log(err);
        }else{
          Comment.findByIdAndUpdate(req.params.commId, {$set: newData}, function(err, comment){
            if (err){
              res.redirect('back');
            }else {
              res.redirect('/topics/'+topic._id+'/blogs/'+blog._id);
            };
          });
        };
      });
    };
  });
});
// Delete route
app.delete('/comments/:id',isLoggedin, function(req, res){
  Comment.findByIdAndRemove(req.params.id, function(err){
    if (err){
      console.log('problem');
    }else{
      res.redirect('back')
    }
  })
});

function isLoggedin(req, res, next){
  if (req.isAuthenticated()){
    return next();
  }else{
    res.redirect('/login')
  }
};

// ---- Switch -------
// app.listen(process.env.PORT, process.env.IP, function(){
//   console.log('Server up...');
// })
// ---- With ---------
app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
// -------------------
