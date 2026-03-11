const express = require('express');
const router = express.Router();
const { createVault, getAllVaults, withdrawVault } = require('../controllers/vaultController');
const { protect } = require('../middleware/auth');

router.post('/create', protect, createVault);
router.get('/all', protect, getAllVaults);
router.post('/withdraw/:id', protect, withdrawVault);

module.exports = router;
