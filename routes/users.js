const express = require('express');
const router = express.Router();
const passport = require('passport');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/user');
const users = require('../controllers/users');
const { isLoggedIn } = require('../middleware');


router.route('/register')
    .get(users.renderRegister)
    .post(catchAsync(users.register));

router.get('/register/:token', users.registerToken);

router.get('/dashboard', users.renderDashboard);

router.get('/about', users.renderAbout);

router.get('/upgrade', users.getAdminCode);
router.get('/upgrade/:token', users.verifyCode);

router.route("/reset/:token")
      .get(users.resetPassword)
      .post(users.postReset)

router.route('/login')
    .get(users.renderLogin)
    .post(passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), users.login)

router.get('/logout', users.logout)

router.route('/contact')
    .get(isLoggedIn, users.renderContact)
    .post(isLoggedIn, users.postContact)

router.route('/forgot')
    .get(users.renderForgot)
    .post(users.postForgot)


module.exports = router;