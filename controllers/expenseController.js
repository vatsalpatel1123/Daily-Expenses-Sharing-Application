const Expense = require('../models/Expense');
const User = require('../models/User');

// Add expense
exports.addExpense = async (req, res) => {
  try {
    const { description, totalAmount, participants, splitMethod } = req.body;

    // Split method: 'equal'
    if (splitMethod === 'equal') {
      const numParticipants = participants.length;
      const equalShare = totalAmount / numParticipants;

      // Update each participant's share with the equal split amount
      participants.forEach(participant => {
        participant.share = equalShare;
      });
    }

    // Split method: 'exact' 
    // This case uses the provided 'share' values directly from the request body for each participant, so no change is needed here.

    // Split method: 'percentage'
    if (splitMethod === 'percentage') {
      const totalPercentage = participants.reduce((acc, curr) => acc + curr.share, 0);

      // Ensure the total percentage equals 100
      if (totalPercentage !== 100) {
        return res.status(400).json({ error: 'Percentages must add up to 100%' });
      }

      // Calculate each participant's share based on percentage
      participants.forEach(participant => {
        participant.share = (participant.share / 100) * totalAmount;
      });
    }

    // Create new expense document
    const newExpense = new Expense({
      description,
      totalAmount,
      participants,
      splitMethod
    });

    // Save expense to the database
    await newExpense.save();
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(400).json({ error: 'Error adding expense' });
  }
};

// Retrieve individual user expenses
exports.getUserExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ 'participants.user': req.params.userId });
    res.status(200).json(expenses);
  } catch (error) {
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

// Download balance sheet
exports.downloadBalanceSheet = async (req, res) => {
  try {
    const expenses = await Expense.find().populate('participants.user', 'name email');
    let balanceSheet = 'Expense Report\n\n';

    expenses.forEach(expense => {
      balanceSheet += `Description: ${expense.description}\nTotal Amount: ${expense.totalAmount}\nParticipants:\n`;
      expense.participants.forEach(p => {
        balanceSheet += `${p.user.name} owes ${p.share}\n`;
      });
      balanceSheet += '\n';
    });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename=balance_sheet.txt');
    res.status(200).send(balanceSheet);
  } catch (error) {
    res.status(400).json({ error: 'Error downloading balance sheet' });
  }
};
