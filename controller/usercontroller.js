const User = require("../model/user");
const CustomError = require("../errors");
const { StatusCodes } = require("http-status-codes");
const Product = require("../model/post");
const jwt = require("jsonwebtoken");

require("dotenv").config();


const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 })
      .populate({
        path: "followers",
        select: "username pictures name",
      })
      .populate({
        path: "following",
        select: "username pictures name",
      })
      .select("name username bio profession pictures email role");

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
};


const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId)
      .populate({
        path: "followers",
        select: "username pictures name",
      })
      .populate({
        path: "following",
        select: "username pictures name",
      });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch posts created by the user
    const userPosts = await Product.find({ user: userId });

    // Attach the posts to the user object
    user.posts = userPosts;

    res.status(200).json(user);
  } catch (error) {
    console.error("Error getting user by ID:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};


const deleteuser = async (req, res) => {
  try {
    const { id } = req.params;
    const finduser = await User.findByIdAndDelete({ _id: id });
    if (!finduser) {
      return res.status(400).json({ error: "no such user found" });
    }
    return res.status(200).json({ message: "deleted sucessfully" });
  } catch (error) {
    res.status(500).json({ error: "something went wrong" });
  }
};




const updateUser = async (req, res) => {
  try {
    const userId = req.userId;
    console.log(userId);
    let updatedUser = await User.findById(userId);

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // List of fields that can be updated
    const updatableFields = [
      'firstname', 'lastname', 'native_city', 'phoneNumber', 'profession',
      'referalcode', 'referallink', 'currentcity', 'username', 'bio'
    ];

    // Update fields if they are present in the request
    updatableFields.forEach(field => {
      if (req.body[field]) {
        updatedUser[field] = req.body[field];
      }
    });

    // Update email if available and validate uniqueness
    if (req.body.email && req.body.email !== updatedUser.email) {
      // const emailAlreadyExists = await User.findOne({ email: req.body.email });
      // if (emailAlreadyExists) {
      //   return res.status(400).json({ error: "Email already exists" });
      // }
      updatedUser.email = req.body.email;
    }

    // Check if the phone number is being updated
    if (req.body.phoneNumber && req.body.phoneNumber !== updatedUser.phoneNumber) {
      const phoneNumberExists = await User.findOne({ phoneNumber: req.body.phoneNumber });
      if (phoneNumberExists) {
        return res.status(400).json({ error: "Phone number already exists" });
      } else {
        // Register a new user with the new phone number
        const newUser = new User({
          phoneNumber: req.body.phoneNumber,
          role: 'user', // Default role as 'user'
          // Copy other fields from the updated user if needed
          firstname: updatedUser.firstname,
          lastname: updatedUser.lastname,
          native_city: updatedUser.native_city,
          profession: updatedUser.profession,
          referalcode: updatedUser.referalcode,
          referallink: updatedUser.referallink,
          currentcity: updatedUser.currentcity,
          username: updatedUser.username,
          bio: updatedUser.bio,
          email: updatedUser.email,
          pictures: updatedUser.pictures
        });
        await newUser.save();

        // Delete the old user
        await updatedUser.remove();

        // Generate a new token for the new user
        const secretKey = process.env.JWT_SECRET;
        const tokenExpiration = process.env.JWT_LIFETIME;

        if (!secretKey || !tokenExpiration) {
          return res.status(500).json({ message: "JWT secret key or token expiration not configured" });
        }

        const token = jwt.sign(
          {
            userId: newUser._id,
            email: newUser.email,
            role: newUser.role,
            username: newUser.username,
            bio: newUser.bio,
            pictures: newUser.pictures,
            profession: newUser.profession,
            currentcity: newUser.currentcity,
            referalcode: newUser.referalcode,
            referallink: newUser.referallink,
            native_city: newUser.native_city
          },
          secretKey,
          { expiresIn: tokenExpiration }
        );

        return res.status(StatusCodes.OK).json({
          message: "User registered with new phone number",
          token,
          user: newUser
        });
      }
    }

    // Handle pictures update if available
    if (req.files && req.files.length > 0) {
      const newPictures = req.files.map(
        file => `${process.env.BASE_URL}/uploads/profile/${file.filename}`
      );
      updatedUser.pictures = newPictures;
    }

    await updatedUser.save();

    // Respond with updated user data
    res.status(200).json({
      message: "User updated successfully",
      user: {
        _id: updatedUser._id,
        firstname: updatedUser.firstname,
        lastname: updatedUser.lastname,
        email: updatedUser.email,
        username: updatedUser.username,
        bio: updatedUser.bio,
        pictures: updatedUser.pictures,
        native_city: updatedUser.native_city,
        phoneNumber: updatedUser.phoneNumber,
        profession: updatedUser.profession,
        referalcode: updatedUser.referalcode,
        referallink: updatedUser.referallink,
        currentcity: updatedUser.currentcity
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const approveUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user is already approved
    if (user.status === "Approved") {
      return res.status(400).json({ error: "User is already approved" });
    }

    // Update the status to 'Approved'
    user.status = "Approved";
    await user.save();

    res.status(200).json({ message: "User approved successfully", user });
  } catch (error) {
    console.error("Error approving user:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};


const updateUserPassword = async (req, res) => {
  const userId = req.params.id;
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new CustomError.BadRequestError("Please provide both values");
  }
  const user = await User.findById(userId);

  const isPasswordCorrect = await user.comparePassword(oldPassword);
  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError("Invalid Credentials");
  }
  user.password = newPassword;

  await user.save();
  res.status(StatusCodes.OK).json({ msg: "Success! Password Updated." });
};

const Notification = require("../model/notification");

const followUnFollowUser = async (req, res) => {
  try {
      const { id } = req.params;
      const userToModify = await User.findById(id);
      const currentUser = await User.findById(req.userId);

      if (id === req.userId.toString())
          return res.status(400).json({ error: "You cannot follow/unfollow yourself" });

      if (!userToModify || !currentUser) return res.status(400).json({ error: "User not found" });

      const isFollowing = currentUser.following.includes(id);

      // Adjust follower count based on action
      let followerCount = userToModify.followers.length;
      if (isFollowing) {
          // Unfollow user
          await User.findByIdAndUpdate(id, { $pull: { followers: req.userId } });
          await User.findByIdAndUpdate(req.userId, { $pull: { following: id } });
          followerCount--; // Decrement follower count
          await Notification.deleteOne({ sender: req.userId, receiver: id, type: "follow" }); // Delete follow notification
          res.status(200).json({ message: "User unfollowed successfully", followerCount });
      } else {
          // Follow user
          await User.findByIdAndUpdate(id, { $push: { followers: req.userId } });
          await User.findByIdAndUpdate(req.userId, { $push: { following: id } });
          followerCount++; // Increment follower count
          await Notification.create({ sender: req.userId, receiver: id, type: "follow" }); // Create follow notification
          res.status(200).json({ message: "User followed successfully", followerCount });
      }
  } catch (err) {
      res.status(500).json({ error: err.message });
      console.log("Error in followUnFollowUser: ", err.message);
  }
};

const showCurrentUser = async (req, res) => {
  res.status(StatusCodes.OK).json({ user: req.user });
};


const getFollowers = async (userId) => {
  try {
    // Find the user by their ID and populate followers with all details
    const user = await User.findById(userId)
      .populate({
        path: "followers",
        select: "username pictures, name", // Exclude password field
      });

    if (!user) {
      throw new Error("User not found");
    }

    // Retrieve the followers of the user
    const followers = user.followers;
    const followerCount = followers.length; // Count the number of followers

    return { followers: followers, followerCount: followerCount }; // Return followers and count
  } catch (error) {
    console.error("Error retrieving followers:", error);
    throw error;
  }
};


const getFollowing = async (userId) => {
  try {
    // Find the user by their ID
    const user = await User.findById(userId)
      .populate({
        path: "following",
        select: "username, pictures, name",
      });

    if (!user) {
      // If user is not found, return a 404 Not Found status code
      return { error: "User not found" };
    }

    // Retrieve the users the user is following
    const following = user.following;
    const followingCount = following.length; // Count the number of users the user is following

    // Return following and count with a 200 OK status code
    return { following: following, followingCount: followingCount };
  } catch (error) {
    // If there's an error, return a 500 Internal Server Error status code
    return { error: "Internal server error" };
  }
};


const searchUserByUsername = async (req, res) => {
  try {
    let { username, fullname } = req.query;

    if (!username && !fullname) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Username or fullname parameter is required" });
    }

    let query = {};

    if (username) {
      query.username = { $regex: new RegExp(username, "i") }; // Search by username
    }

    if (fullname) {
      query.name = { $regex: new RegExp(fullname, "i") }; // Search by fullname
    }

    // Search users by username or fullname using case-insensitive regex
    const users = await User.find(query)
      .select("name username bio profession pictures email role");

    res.status(StatusCodes.OK).json(users);
  } catch (error) {
    console.error("Error searching user by username or fullname:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const getProfileByToken = async (req, res) => {
  const bearerToken = req.headers.authorization;

  if (!bearerToken) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Bearer Token not provided" });
  }

  const token = bearerToken.split(" ")[1]; // Extract token from "Bearer <token>" format

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }

    // Return only public profile information, excluding sensitive fields
    const userProfile = {
      name: user.name,
      email: user.email,
      role: user.role,
      username: user.username,
      bio: user.bio,
      pictures: user.pictures,
      profession: user.profession
    };

    return res.status(StatusCodes.OK).json({ userProfile });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Token expired" });
    }
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid token" });
  }
};


module.exports = {
  getAllUsers,
  getUserById,
  deleteuser,
  updateUser,
  getFollowers,
  searchUserByUsername,
  getFollowing,
  updateUserPassword,
  followUnFollowUser, 
  showCurrentUser,
  getProfileByToken,
  approveUser
};
