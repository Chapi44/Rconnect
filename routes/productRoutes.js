const express = require('express');
const router = express.Router();
const path = require ('path')
const multer = require("multer");
const {
  authAuthorization ,
  authMiddleware ,
} = require("../middelware/authMiddleware");

const {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  likeProduct
} = require('../controller/productController');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/products/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router
  .route('/')
  .post( authMiddleware,
    upload.array('images', 6),createProduct)
  .get(getAllProducts);


router
  .route('/:id')
  .get(getSingleProduct)
  .patch(authMiddleware, updateProduct)
  .delete(authMiddleware, deleteProduct);
  router.post("/likeproduct/:id", authMiddleware, likeProduct);

module.exports = router;
