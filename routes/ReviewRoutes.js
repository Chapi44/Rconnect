const express = require("express");
const router = express.Router();
// const path = require("path");



const {
  createReview,
  getAllReviews,
  getSingleReview,
  updateReview,
  deleteReview,
} = require("../controller/reviewController");

const {
  authAuthorization ,
  authMiddleware ,
} = require("../middelware/authMiddleware");

router.post("/",authMiddleware,createReview)
router.get("/", getAllReviews);

router
  .route("/:id")
  .get(getSingleReview)
  .patch( updateReview)
  .delete(
    deleteReview
  );



module.exports = router;