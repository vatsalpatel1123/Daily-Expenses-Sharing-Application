const Expense = require('../models/Expense');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const pdf = require('html-pdf');

exports.addExpense = async (req, res) => {
  try {
    const { email, password, description, totalAmount, participants, splitMethod } = req.body;

    // Validate user credentials
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Email not registered' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Incorrect credentials' });
    }

    // Convert participant emails to ObjectIds
    const participantIds = await Promise.all(participants.map(async (participant) => {
      const participantUser = await User.findOne({ email: participant.user });
      if (!participantUser) {
        // Log the not found email to the console
        console.error(`Participant with email ${participant.user} not found`);
        throw new Error(`Participant with email ${participant.user} not found`);
      }
      return participantUser._id;
    }));

    // Update participants with ObjectIds and shares
    const updatedParticipants = participants.map((participant, index) => ({
      user: participantIds[index],
      share: participant.share
    }));

    // Calculate shares based on split method
    if (splitMethod === 'equal') {
      const equalShare = totalAmount / updatedParticipants.length;
      updatedParticipants.forEach(participant => participant.share = equalShare);
    } else if (splitMethod === 'percentage') {
      const totalPercentage = updatedParticipants.reduce((acc, curr) => acc + curr.share, 0);
      if (totalPercentage < 98 || totalPercentage > 102) {
        return res.status(400).json({ error: 'Total percentages must equal 100% within a 2% margin' });
      }
      updatedParticipants.forEach(participant => {
        participant.share = (participant.share / 100) * totalAmount;
      });
    } else if (splitMethod === 'exact') {
      const totalShares = updatedParticipants.reduce((acc, curr) => acc + (curr.share || 0), 0);
      if (Math.abs(totalShares - totalAmount) > 10) {
        return res.status(400).json({ error: 'Shares must equal total amount within 10 rupees' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid split method' });
    }

    const newExpense = new Expense({
      description,
      totalAmount,
      participants: updatedParticipants,
      splitMethod
    });

    await newExpense.save();
    res.status(201).json(newExpense);
  } catch (error) {
    console.error('Error adding expense:', error);
    // Return specific error message if it's a participant not found issue
    if (error.message.includes('Participant with email')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(400).json({ error: 'Error adding expense' });
  }
};

// Retrieve individual user expenses and generate PDF with only the user's share details
exports.getUserExpenses = async (req, res) => {
  try {
    const { password } = req.body; // Get password from request body

    // Find user by email (not by ID)
    const user = await User.findOne({ email: req.params.userId });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Validate user password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Retrieve expenses where the user is a participant
    const expenses = await Expense.find({ 'participants.user': user._id }).populate('participants.user', 'name email');

    let totalShare = 0; // Variable to keep track of the total share of the user

    // Build the HTML for the PDF
    let html = `
      <html>
      <head>
        <style>
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid black;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          h1, h2 {
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>Expense Report for ${user.name}</h1>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Description</th>
              <th>Total Amount(₹)</th>
              <th>Split Method</th>
              <th>Your Share(₹)</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>`;

    // Loop through expenses and filter the user's share
    expenses.forEach((expense, index) => {
      // Find the current user's share in this expense
      const userExpense = expense.participants.find(p => p.user._id.toString() === user._id.toString());

      if (userExpense) {
        const createdDate = expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : 'Unknown Date';

        // Add the user's share to the total
        totalShare += userExpense.share || 0;

        // Add the expense details to the HTML
        html += `
          <tr>
            <td>${index + 1}</td>
            <td>${expense.description || 'No Description'}</td>
            <td>${expense.totalAmount || '0'}</td>
            <td>${expense.splitMethod || 'N/A'}</td>
            <td>${userExpense.share || '0'}</td>
            <td>${createdDate}</td>
          </tr>`;
      }
    });

    // Add total share amount at the end of the table
    html += `
          </tbody>
        </table>
        <h2>Total Share Amount: ₹${totalShare.toFixed(2)}</h2>
      </body>
      </html>`;

    // Convert the HTML to PDF and send it as a response
    pdf.create(html).toStream((err, stream) => {
      if (err) {
        return res.status(500).send('Error creating PDF');
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${user.name}_expense_report.pdf`);
      stream.pipe(res);
    });
  } catch (error) {
    console.error("Error retrieving user expenses:", error); // Log error for debugging
    res.status(400).json({ error: 'Error retrieving user expenses' });
  }
};


// Retrieve all expenses
exports.getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().populate('participants.user', 'name email');
    res.status(200).json(expenses);
  } catch (error) {
    res.status(400).json({ error: 'Error retrieving expenses' });
  }
};

// Download balance sheet and convert to PDF
exports.downloadBalanceSheet = async (req, res) => {
  try {
    const expenses = await Expense.find().populate('participants.user', 'name email');

    let html = `
      <html>
      <head>
        <style>
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Expense Report</h1>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Description</th>
              <th>Total Amount(₹)</th>
              <th>Split Method</th>
              <th>Participants</th>
              <th>Shares(₹)</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>`;

    expenses.forEach((expense, index) => {
      const createdDate = expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : 'Unknown Date';

      html += `
        <tr>
          <td rowspan="${expense.participants.length}">${index + 1}</td>
          <td rowspan="${expense.participants.length}">${expense.description || 'No Description'}</td>
          <td rowspan="${expense.participants.length}">${expense.totalAmount || '0'}</td>
          <td rowspan="${expense.participants.length}">${expense.splitMethod || 'N/A'}</td>
          <td>${expense.participants[0].user ? `${expense.participants[0].user.name} (${expense.participants[0].user.email})` : 'Unknown Participant'}</td>
          <td>${expense.participants[0].share || '0'}</td>
          <td rowspan="${expense.participants.length}">${createdDate}</td>
        </tr>`;

      for (let i = 1; i < expense.participants.length; i++) {
        html += `
          <tr>
            <td>${expense.participants[i].user ? `${expense.participants[i].user.name} (${expense.participants[i].user.email})` : 'Unknown Participant'}</td>
            <td>${expense.participants[i].share || '0'}</td>
          </tr>`;
      }
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>`;

    pdf.create(html).toStream((err, stream) => {
      if (err) {
        return res.status(500).send('Error creating PDF');
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=balance_sheet.pdf');
      stream.pipe(res);
    });
  } catch (error) {
    console.error('Error downloading balance sheet:', error);
    res.status(400).json({ error: 'Error downloading balance sheet' });
  }
};
