const express = require('express');
const router = express.Router();
const campgrounds = require('../controllers/campgrounds');
const catchAsync = require('../utils/catchAsync');
const { isLoggedIn, isAuthor } = require('../middleware');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });

const Campground = require('../models/campground');

router.route('/')
    .get(catchAsync(campgrounds.index))
    .post(isLoggedIn, upload.array('image'), catchAsync(campgrounds.createCampground))


router.get('/new', isLoggedIn, campgrounds.renderNewForm);

router.post('/:id/likes', isLoggedIn, campgrounds.postLikes);


router.route('/:id')
    .get(isLoggedIn, catchAsync(campgrounds.showCampground))
    .put(isLoggedIn, isAuthor, upload.array('image'), catchAsync(campgrounds.updateCampground))
    .delete(isLoggedIn, isAuthor, catchAsync(campgrounds.deleteCampground));

router.get('/:id/edit', isLoggedIn, isAuthor, catchAsync(campgrounds.renderEditForm))

router.post('/:id/book', isLoggedIn, catchAsync(campgrounds.postBook));


module.exports = router;