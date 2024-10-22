const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

// Initialize Express
const app = express();

// Middleware to parse JSON
app.use(express.json());

// MongoDB Connection
const mongoURI = 'mongodb://localhost:27017/expense-sharing'; // Update 'yourDB' with your actual database name

mongoose.connect(mongoURI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

// Routes
app.use('/api/users', userRoutes); // User routes
app.use('/api/expenses', expenseRoutes); // Expense routes

// Server setup
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
