// routes/documentationRoutes.js

const express = require('express');
const router = express.Router();
const documentationController = require('../controllers/documentationController');

router.post('/generate-doc', documentationController.generateDocumentation);

module.exports = router;

