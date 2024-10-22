const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Create user
exports.createUser = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, mobile, password: hashedPassword });
    await newUser.save();

    // Do not send back the password
    newUser.password = undefined; 

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error); // Log the error for debugging
    res.status(400).json({ error: 'Error creating user' });
  }
};

// Retrieve user details
exports.getUserDetails = async (req, res) => {
    try {
      console.log("Received userId:", req.params.userId);  // Debugging
      const user = await User.findById(req.params.userId);
  
      if (!user) {
        console.log("User not found");  // Debugging
        return res.status(404).json({ error: 'User not found' });
      }
  
      console.log("Found user:", user);  // Debugging
      res.status(200).json(user);
    } catch (error) {
      console.error("Error in retrieval:", error);  // Debugging
      res.status(400).json({ error: 'Error retrieving user' });
    }
  };
  
