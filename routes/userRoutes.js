const express = require('express');
const { createUser, getUserDetails } = require('../controllers/userController');
const router = express.Router();

router.post('/create', createUser);
router.get('/:userId', getUserDetails);

module.exports = router;
