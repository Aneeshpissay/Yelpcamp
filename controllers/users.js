const User = require('../models/user');
const passport = require('passport');
var nodemailer = require("nodemailer");
var async = require("async");
var crypto = require("crypto");
var moment = require('moment');
const Campground = require('../models/campground');
const Review = require('../models/review');
const Booking = require('../models/booking');

const code = process.env.SECRET_KEY;

module.exports.renderRegister = (req, res) => {
    res.render('users/register');
}

module.exports.register = async (req, res, next) => {
        const { email, phone, username, password, adminCode} = req.body;
        const user = new User({ email, username, phone });
        if(adminCode === code){
          user.isAdmin = true;
        }
        await User.register(user, password, (err, users)=>{
            if (err) {
                req.flash("error",err.message)
                res.redirect("/register")
            }
            else {
                req.flash('success', 'An e-mail has been sent to ' + req.body.email + ' with further instructions.');
                res.redirect("/login")
                async.waterfall([
                    (done)=>{
                        crypto.randomBytes(20, (err, buf)=>{
                            var token = buf.toString('hex');
                            done(err, token);
                        })
                    },
                    (token, done)=>{
                        User.findOne({email: req.body.email}, (err, user)=>{
                            if(!user){
                                req.flash('error', 'Email already exists');
                                return res.redirect('/register');
                            }
                            user.verifyEmail = token;
                            user.active = false;
                            user.save(function(err) {
                                done(err, token, user);
                            });
                        });
                    },
                    (token, user, done)=>{
                        var smtpTransport = nodemailer.createTransport({
                            service: 'Gmail', 
                            auth: {
                              user: process.env.GMAILID,
                              pass: process.env.GMAILPASS
                            }
                        })
                        const msg = {
                            to: req.body.email,
                            from: process.env.GMAILID, // Use the email address or domain you verified above
                            subject: 'Yelpcamp email address verfication',
                            html: `<p>You are receiving this because to verify your account.</p><p>Please click on the following button to activate:</p><div style="text-align: center"><a href=${'http://' + req.headers.host + '/register/' + token} style="background-color: #28a745;border: none;color: white;padding: 10px 20px;text-align: center;text-decoration: none;display: inline-block;font-size: 16px;cursor: pointer;">Activate</a></div>`,
                          };
                          smtpTransport.sendMail(msg, (err)=>{
                            done(err, 'done');
                        })
                    }
                ])
            }
        })
}

module.exports.registerToken = async(req, res)=>{
    async.waterfall([
        function(done) {
          User.findOne({ verifyEmail: req.params.token}, function(err, user) {
            if (!user) {
              req.flash('error', 'activation token is invalid or has expired.');
              return res.redirect('back');
            }
                user.verifyEmail = null;
                user.active= true;
                user.save(function(err) {
                  req.logIn(user, function(err) {
                    done(err, user);
                });
                });
          });
        },
        function(user, done) {
          var smtpTransport = nodemailer.createTransport({
            service: 'Gmail', 
            auth: {
              user: process.env.GMAILID,
              pass: process.env.GMAILPASS
            }
          });
          var mailOptions = {
            to: user.email,
            from: process.env.GMAILID,
            subject: 'YelpCamp Confirmation',
            text: 'Hello,\n\n' +
              'This is a confirmation that your account ' + user.email +  ' has been verified.\n'
          };
          smtpTransport.sendMail(mailOptions, function(err) {
            req.flash('success', 'Registered successfully.');
            done(err);
          });
        }
      ], function(err) {
        res.redirect('/campgrounds');
      });
}

module.exports.renderLogin = (req, res) => {
    res.render('users/login');
}

module.exports.login = (req, res) => {
      if(req.user.isAdmin){
        req.flash('success', `Welcome Back Admin ${req.user.username}!`);
        const redirectUrl = req.session.returnTo || '/campgrounds';
        delete req.session.returnTo;
        res.redirect(redirectUrl);
      }
      else {
        req.flash('success', `Welcome Back ${req.user.username}!`);
        const redirectUrl = req.session.returnTo || '/campgrounds';
        delete req.session.returnTo;
        res.redirect(redirectUrl);
      }
}

module.exports.logout = (req, res) => {
    req.logout();
    // req.session.destroy();
    req.flash('success', `Goodbye!`);
    res.redirect('/campgrounds');
}

module.exports.renderContact = (req, res) => {
    res.render('users/contact', {user: req.user});
}

module.exports.renderForgot = (req, res) => {
    res.render('users/forgot');
}

module.exports.postForgot = (req, res) => {
    async.waterfall([
        function(done) {
          crypto.randomBytes(20, function(err, buf) {
            var token = buf.toString('hex');
            done(err, token);
          });
        },
        function(token, done) {
          User.findOne({ email: req.body.email }, function(err, user) {
            if (!user) {
              req.flash('error', 'No account with that email address exists.');
              return res.redirect('/forgot');
            }
    
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    
            user.save(function(err) {
              done(err, token, user);
            });
          });
        },
        function(token, user, done) {
          var smtpTransport = nodemailer.createTransport({
            service: 'Gmail', 
            auth: {
              user: process.env.GMAILID,
              pass: process.env.GMAILPASS
            }
        })
          var mailOptions = {
            to: user.email,
            from: process.env.GMAILID,
            subject: 'YelpCamp Password Reset',
            html: `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
            <p>Please click on the following button to complete the process:</p>
            <div style="text-align: center">
            <a href=${'http://' + req.headers.host + '/reset/' + token} style="background-color: #4CAF50;
            border: none;
            color: white;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
            margin: 4px 2px;
            cursor: pointer;">Reset Password</a>
            </div>
            <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`
          };
          smtpTransport.sendMail(mailOptions, function(err) {
            req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
            done(err, 'done');
          });
        }
      ], function(err) {
        if (err)
        return next(err);
        res.redirect('/forgot');
      });
}

module.exports.resetPassword = (req, res) => {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('/forgot');
        }
        res.render('users/reset', {token: req.params.token});
      });
};

module.exports.postReset = (req, res) => {
    async.waterfall([
        function(done) {
          User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
            if (!user) {
              req.flash('error', 'Password reset token is invalid or has expired.');
              return res.redirect('back');
            }
            if(req.body.password === req.body.confirm) {
              user.setPassword(req.body.password, function(err) {
                user.resetPasswordToken = null;
                user.resetPasswordExpires = null;
    
                user.save(function(err) {
                  req.logIn(user, function(err) {
                    done(err, user);
                  });
                });
              })
            } else {
                req.flash("error", "Passwords do not match.");
                return res.redirect(`/reset/${req.params.token}`);
            }
          });
        },
        function(user, done) {
          var smtpTransport = nodemailer.createTransport({
            service: 'Gmail', 
            auth: {
              user: process.env.GMAILID,
              pass: process.env.GMAILPASS
            }
          });
          var mailOptions = {
            to: user.email,
            from: process.env.GMAILID,
            subject: 'Your password has been changed',
            text: 'Hello,\n\n' +
              'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
          };
          smtpTransport.sendMail(mailOptions, function(err) {
            req.flash('success', 'Success! Your password has been changed.');
            done(err);
          });
        }
      ], function(err) {
        res.redirect('/campgrounds');
      });
}

module.exports.postContact = (req, res) => {
    async.waterfall([
        function(done) {
          var smtpTransport = nodemailer.createTransport({
            service: 'Gmail', 
            auth: {
              user: process.env.GMAILID,
              pass: process.env.GMAILPASS
            }
          });
          var mailOptions = {
            to: process.env.GMAILID,
            from: req.body.email,
            subject: `Message from ${req.body.username}`,
            text: req.body.message
          };
          smtpTransport.sendMail(mailOptions, function(err) {
            req.flash('success', 'Message sent successfully.');
            done(err);
          });
        }
      ], function(err) {
        res.redirect('/contact');
      });
}

module.exports.renderDashboard = async (req, res) => {
  try {
    let user = await User.findById(req.user._id).exec()
      try {
        let camp = await Campground.find().where("author").equals(user._id).exec();
        let review = await Review.find().exec();
        let booking = await Booking.find().where("author").equals(user._id).exec();
        var data = {
          user: user,
          campgrounds: camp,
          reviews: review,
          moment: moment,
          booking: booking
        }
        res.render("users/dashboard",data)
       } catch(err) {
         req.flash("error",err.message);
        res.redirect("/")
       }
      } catch(err) {
    req.flash('error', err.message);
    return res.redirect('back');
  }
}

module.exports.renderAbout = async (req, res) => {
  res.render("users/about", {user: req.user})
}

module.exports.getAdminCode = async (req, res) => {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ username: req.user.username }, function(err, user) {
        user.code = token;

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: process.env.GMAILID,
          pass: process.env.GMAILPASS
        }
    })
      var mailOptions = {
        to: user.email,
        from: process.env.GMAILID,
        subject: 'YelpCamp Upgrade',
        html: `<p>You are receiving this because you (or someone else) have requested the upgrade for your account.</p>
        <p>Please click on the following button to complete the process:</p>
        <div style="text-align: center">
        <a href=${'http://' + req.headers.host + '/upgrade/' + token} style="background-color: #4CAF50;
        border: none;
        color: white;
        padding: 10px 20px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 16px;
        margin: 4px 2px;
        cursor: pointer;">Upgrade Account</a>
        </div>
        <p>If you did not request this, please ignore this email.</p>`
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err)
    return next(err);
    res.redirect('/campgrounds');
  });
}

module.exports.verifyCode = async (req, res) => {
  async.waterfall([
    function(done) {
      User.findOne({ code: req.params.token}, function(err, user) {
        if (!user) {
          req.flash('error', 'Upgrade token is invalid or has been expired.');
          return res.redirect('back');
        }
            user.code = null;
            user.isAdmin = true;
            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
            });
            });
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: process.env.GMAILID,
          pass: process.env.GMAILPASS
        }
      });
      var mailOptions = {
        to: user.email,
        from: process.env.GMAILID,
        subject: 'YelpCamp Upgrade Confirmation',
        text: 'Hello,\n\n' +
          'This is a confirmation that your account ' + user.email +  ' has been upgraded.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Account upgraded successfully.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
}