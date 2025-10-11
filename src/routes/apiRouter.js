// src/routes/apiRouter.js

const express = require('express');
const router = express.Router();

// -------------------------------------------------------------------------
// Routes Imports
// -------------------------------------------------------------------------

// Auth Module Routes
const authRoutes = require('../../src/modules/auth/userAuth/userAuth.route'); 

// Master Data Modules
// const uomRoutes = require('../../src/modules/masterData/uom/uom.route');      // <--- COMMENTED OUT
// const roleRoutes = require('../../src/modules/masterData/roles/role.route');  // <--- COMMENTED OUT

// Master Modules
// const partRoutes = require('../../src/modules/master/parts/part.route');    // <--- COMMENTED OUT
// const userRoutes = require('../../src/modules/master/users/user.route');    // <--- COMMENTED OUT

// -------------------------------------------------------------------------
// Route Middleware & Grouping
// -------------------------------------------------------------------------

router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'JIT QC API is running successfully!',
        version: '1.0.0'
    });
});

/**
 * AUTH Routes: KEEP THIS ACTIVE
 * Base path: /api/auth
 */
router.use('/auth', authRoutes);


// Master Data Routes (Shared/Config Data)
// router.use('/masterData/uoms', uomRoutes);    // <--- COMMENTED OUT
// router.use('/masterData/roles', roleRoutes);  // <--- COMMENTED OUT

// Core Master Routes (Application Entities)
// router.use('/master/parts', partRoutes);      // <--- COMMENTED OUT
// router.use('/master/users', userRoutes);      // <--- COMMENTED OUT


module.exports = router;