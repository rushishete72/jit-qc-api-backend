// src/routes/apiRouter.js

const express = require('express');
const router = express.Router();

// 🚨 यह पाथ सबसे अधिक संभावना है कि गलत है
// मान लें कि apiRouter.js 'src/routes/' में है, और authRouter 'src/modules/auth/index.js' में है
const authRouter = require('../modules/auth/index'); 
const masterDataRouter = require('../modules/masterData');

// --- Main Route Grouping ---
router.use('/auth', authRouter); 

router.use('/master', masterDataRouter); 
module.exports = router; // राउटर को सही ढंग से निर्यात करना महत्वपूर्ण है