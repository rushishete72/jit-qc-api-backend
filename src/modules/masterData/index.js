const express = require('express');
const router = express.Router();

// Import all sub-modules for Master Data
const rolesRouter = require('./roles/role.route');
const uomRouter = require('./uom/uom.route'); // To be added later
const partsRouter = require('./parts/parts.route'); // To be added laterparts
// Route Master Data partses
// Maps to /api/master/roles
router.use('/roles', rolesRouter);

// Maps to /api/master/uom (if you create it)
router.use('/uom', uomRouter); 
router.use('/parts', partsRouter); 


module.exports = router;