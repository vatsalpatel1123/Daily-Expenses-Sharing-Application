const User = require('../models/User');

// Create user
exports.createUser = async (req, res) => {
  try {
    const { name, email, mobile } = req.body;
    const newUser = new User({ name, email, mobile });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
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
  
