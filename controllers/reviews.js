const Campground = require('../models/campground');
const Review = require('../models/review');

module.exports.createReview = async (req, res) => {
    const campground = await Campground.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    var ratedArray = [];
    for(var i=0;i<campground.reviews.length;i++){
      ratedArray.push(String(campground.reviews[i].author._id))
    }
    if (ratedArray.includes(String(req.user._id))) {
      req.flash(
        "error",
        "You've already reviewed this campgroud"
      );
      res.redirect(`/campgrounds/${campground._id}`);
    }
    else {
        const review = new Review(req.body.review);
        review.author = req.user._id;
        campground.reviews.push(review);
        await review.save();
        await campground.save();
        req.flash('success', 'Created new review!');
        res.redirect(`/campgrounds/${campground._id}`);
    }
}

module.exports.deleteReview = async (req, res) => {
    const { id, reviewId } = req.params;
    await Campground.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash('success', 'Successfully deleted review')
    res.redirect(`/campgrounds/${id}`);
}
