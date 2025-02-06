const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");


const { Schema } = mongoose; // Import Schema from mongoose

const UserSchema = new Schema({
  firstname: {
    type: String,
    // required: true,
  },
  lastname: { type: String},

  username:{
    type: String,
    // unique: true,
  },
  bio:{
    type: String
  },
  currentcity: { type: String},
  referalcode: { type: String}, 
  referallink: { type: String}, 
  profession: { // Adding the profession field
    type: String
  },
  pictures: {
    type: [String],
    default: "https://gratify.letsgotnt.com/uploads/profile/pictures-1713961058221.png",
    // default: "http://localhost:4500/uploads/profile/pictures-1713961058221.png",
  },
  email: {
    type: String,
    // required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  native_city: { type: String,
    //  required: true
    },
  password: {
    type: String,
    // required: true,
  },
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  About_your_store:{
    type: String,
    
  },
  Shop_Name:{type: String},
  Shop_Address:{type: String},
  Bank_Account_Number:{type: String},
  IFSC_Code:{type: String},
  PAN_Card_Number:{type: String},
  product_category:{type: String},
  status: { type: String,enum:["Pending","Approved","Rejected"], default: 'Pending' }, 

  role: {
    type: String,
    enum: ["user", "admin","seller"],
    default: "user",
    required: true,
  },
});

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

module.exports = mongoose.model("User", UserSchema);
