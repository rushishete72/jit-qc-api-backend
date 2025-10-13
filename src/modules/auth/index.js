// src/modules/auth/index.js

const express = require('express');
const router = express.Router();

// 1. Core Password/Admin Approved Login (User Auth)
// ✅ सुनिश्चित करें कि यह पाथ सही है:
const userAuthRoutes = require('./userAuth/userAuth.route'); 
const adminAuthRouter = require('./adminAuth/adminAuth.route'); 


// 2. Future: Google/OAuth Login (Google Auth)
// const googleAuthRoutes = require('./googleAuth/google.route'); 

// Sub-Module Aggregation
router.use('/local', userAuthRoutes); 
router.use('/admin', adminAuthRouter); 

// Future: router.use('/google', googleAuthRoutes); 

module.exports = router; // 🚨 सुनिश्चित करें कि यह router निर्यात किया गया है!