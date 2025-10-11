/**
 * @fileoverview Main API Router Aggregator.
 * @description यह मॉड्यूल सभी सब-रूट मॉड्यूलों को आयात (imports) करता है और 
 * उन्हें उनके संबंधित URL प्रीफ़िक्स (URL prefixes) के तहत समूहीकृत (group) करता है।
 * यह Express API के लिए प्रवेश का प्राथमिक बिंदु (primary entry point) है।
 * @module routes/apiRouter
 */

const express = require('express');
const router = express.Router();

// -------------------------------------------------------------------------
// Routes Imports
// -------------------------------------------------------------------------

// Auth Module Routes
const authRoutes = require('../src/modules/auth/userAuth/userAuth.route'); 

// Master Data Modules
const uomRoutes = require('../src/modules/masterData/uom/uom.route'); 
const roleRoutes = require('../src/modules/masterData/roles/role.route');

// Master Modules
const partRoutes = require('../src/modules/master/parts/part.route');
// ✅ FIX: Users Module Route को आयात करें
const userRoutes = require('../src/modules/master/users/user.route'); 

// -------------------------------------------------------------------------
// Route Middleware & Grouping
// -------------------------------------------------------------------------

/**
 * Health Check / Default Route
 * @name GET /
 * @function
 * @param {object} req - Express Request
 * @param {object} res - Express Response
 */
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'JIT QC API is running successfully!',
        version: '1.0.0'
    });
});

/**
 * AUTH Routes
 * Base path: /api/auth
 */
router.use('/auth', authRoutes);


/**
 * Master Data Routes (Shared/Config Data)
 * Base path: /api/masterData
 */
router.use('/masterData/uoms', uomRoutes);
router.use('/masterData/roles', roleRoutes);

/**
 * Core Master Routes (Application Entities)
 * Base path: /api/master
 */
router.use('/master/parts', partRoutes);

// ✅ FIX: Users Routes को जोड़ें
// यह सुनिश्चित करता है कि /api/master/users रूट अब उपलब्ध है
router.use('/master/users', userRoutes);


module.exports = router;