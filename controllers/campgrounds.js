const Campground = require('../models/campground');
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = 'pk.eyJ1IjoiYW5lZXNocGlzc2F5IiwiYSI6ImNranZpc2FqbDA5MTgydnBnMjdmZnBtOHcifQ.N4WYihlYJlwQIu5Hg7g-UA';
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const { cloudinary } = require("../cloudinary");
var moment = require('moment');
const Booking = require('../models/booking');
var nodemailer = require("nodemailer");
var async = require("async");
var crypto = require("crypto");

module.exports.index = async (req, res) => {
    var noMatch = null;
  if (req.query.search) {
    const regex = new RegExp(escape(req.query.search), 'gi');
    Campground.find({ $or: [ { title: regex}, { location: regex } ] } , function(err, allCampgrounds) {
      if (err) {
        console.log(err);
      } else {        
        if(allCampgrounds.length<1){
            noMatch="No campground found for this search"
        }
        res.render("campgrounds/index",{campgrounds:allCampgrounds,noMatch:noMatch, user: req.user})
      }
    });
  } else if (req.query.sortby) {
    if (req.query.sortby === "rateAvg") {
      Campground.find({})
        .sort({
          rateCount: -1,
          rateAvg: -1
        })
        .exec(function(err, allCampgrounds) {
          if (err) {
            console.log(err);
          } else {
            res.render("campgrounds/index", {
              campgrounds: allCampgrounds,
              user: req.user,
              noMatch: noMatch
            });
          }
        });
    } else if (req.query.sortby === "rateCount") {
      Campground.find({})
        .sort({
          rateCount: -1
        })
        .exec(function(err, allCampgrounds) {
          if (err) {
            console.log(err);
          } else {
            res.render("campgrounds/index", {
              campgrounds: allCampgrounds,
              user: req.user,
              noMatch: noMatch
            });
          }
        });
    } else if (req.query.sortby === "priceLow") {
      Campground.find({})
        .sort({
          price: 1,
          rateAvg: -1
        })
        .exec(function(err, allCampgrounds) {
          if (err) {
            console.log(err);
          } else {
            res.render("campgrounds/index", {
              campgrounds: allCampgrounds,
              user: req.user,
              noMatch: noMatch
            });
          }
        });
    } else {
      Campground.find({})
        .sort({
          price: -1,
          rateAvg: -1
        })
        .exec(function(err, allCampgrounds) {
          if (err) {
            console.log(err);
          } else {
            res.render("campgrounds/index", {
              campgrounds: allCampgrounds,
              user: req.user,
              noMatch: noMatch
            });
          }
        });
    }
  } else {
    Campground.find({}, function(err, allCampgrounds) {
      if (err) {
        console.log(err);
      } else {
        res.render("campgrounds/index", {
          campgrounds: allCampgrounds,
          user: req.user,
          noMatch: noMatch
        });
      }
    });
  }
}

module.exports.renderNewForm = (req, res) => {
    res.render('campgrounds/new', {user: req.user});
}

module.exports.createCampground = async (req, res, next) => {
    try {
      const geoData = await geocoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
      }).send()
      const campground = new Campground(req.body.campground);
      campground.geometry = geoData.body.features[0].geometry;
      campground.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
      campground.author = req.user._id;
      await campground.save();
      req.flash('success', 'Successfully made a new campground!');
      res.redirect(`/campgrounds/${campground._id}`)
    } catch (error) {
      req.flash('error', error.errors.images.message);
      res.redirect('/campgrounds/new')
    }
}

module.exports.showCampground = async (req, res,) => {
    const campground = await Campground.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    if (!campground) {
        req.flash('error', 'Cannot find that campground!');
        return res.redirect('/campgrounds');
    }
    var rate = [];
    for(var i=0;i<campground.reviews.length;i++){
      rate.push(campground.reviews[i].rating)
    }
    var sum = rate.reduce(function(a, b){
      return a + b;
    }, 0);
    var total = rate.length;
    var avgRate = sum/total;
    res.render('campgrounds/show', { campground, user: req.user, moment: moment, avgRate: avgRate });
}

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findById(id)
    if (!campground) {
        req.flash('error', 'Cannot find that campground!');
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/edit', { campground, user: req.user });
}

module.exports.updateCampground = async (req, res) => {
    try {
      const { id } = req.params;
      const camp = await Campground.findById(id);
      if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
        }
        await camp.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    }
    const geoData = await geocoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
    }).send();
    const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
    campground.geometry = geoData.body.features[0].geometry;
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.images.push(...imgs);
    await campground.save();
    req.flash('success', 'Successfully updated campground!');
    res.redirect(`/campgrounds/${campground._id}`)
    } catch (error) {
      const { id } = req.params;
      const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
      req.flash('error', error.errors.images.message);
      res.redirect(`/campgrounds/${campground._id}/edit`)
    }
}

module.exports.deleteCampground = async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findByIdAndDelete(id);
    for (let filename of campground.images) {
        await cloudinary.uploader.destroy(filename.filename);
    }
    req.flash('success', 'Successfully deleted campground')
    res.redirect('/campgrounds');
}

module.exports.postBook = async (req, res) => {
  const campground = await Campground.findById(req.params.id).populate({
    path: 'booking',
    populate: {
        path: 'author'
    }
}).populate('author');
  var bookArray = [];
  for(var i=0;i<campground.booking.length;i++){
    bookArray.push(String(campground.booking[i].author._id))
  }
  if (bookArray.includes(String(req.user._id))) {
    req.flash(
      "error",
      "You've already booked this campgroud"
    );
    res.redirect(`/campgrounds/${campground._id}`);
  }
  else {
      const booking = new Booking(req.body);
      booking.author = req.user._id;
      var day = (new Date(req.body.enddate) - new Date(req.body.startdate))/ (1000 * 3600 * 24);
      booking.days = day;
      var price = campground.price * day * req.body.persons;
      booking.price = price;
      booking.title = campground.title
      campground.booking.push(booking);
      await booking.save();
      await campground.save();
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
            to: req.user.email,
            from: process.env.GMAILID,
            subject: 'YelpCamp Booking Confirmation',
            text: 'Hello,\n\n' +
              'This is a confirmation that your campground ' + campground.title + ' has been booked successfully for ' + day + ' days for ' + price + 'Rs\n' + 
              'Happy journey'
          };
          smtpTransport.sendMail(mailOptions, function(err) {
            req.flash('success', 'Campground Booked Successfully.');
            done(err);
          });
        }
      ], function(err) {
        res.redirect(`/campgrounds/${campground._id}`);
      });
  }
}

module.exports.postLikes = (req , res) => {
  Campground.findById(req.params.id, function (err, campground) {
    if (err) {
        console.log(err);
        return res.redirect(`/campgrounds/${campground._id}`);
    }

    // check if req.user._id exists in foundCampground.likes
    var foundUserLike = campground.likes.some(function (like) {
        return like.equals(req.user._id);
    });

    if (foundUserLike) {
        // user already liked, removing like
        campground.likes.pull(req.user._id);
    } else {
        // adding the new user like
        campground.likes.push(req.user);
    }

    campground.save(function (err) {
        if (err) {
            console.log(err);
            return res.redirect(`/campgrounds/${campground._id}`);
          }
          return res.redirect(`/campgrounds/${campground._id}`);
        });
});
}