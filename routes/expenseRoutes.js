const express = require('express');
const {
  addExpense,
  getUserExpenses,
  getAllExpenses,
  downloadBalanceSheet
} = require('../controllers/expenseController');
const router = express.Router();

router.post('/add', addExpense);
router.get('/user/:userId', getUserExpenses);
router.get('/all', getAllExpenses);
router.get('/download', downloadBalanceSheet);

module.exports = router;
