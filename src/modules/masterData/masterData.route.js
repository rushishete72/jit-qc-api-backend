// modules/masterData/masterData.route.js (UPGRADED for D1.3 FIX)

/**
 * @fileoverview यह मॉड्यूल मास्टर डेटा से संबंधित सभी API राउट्स (मुख्य रूप से UOM राउट्स) को परिभाषित करता है।
 * यह Express Router का उपयोग करता है और विशिष्ट इन्वेंट्री-संबंधित राउट्स के लिए एक सब-राउटर (`inventoryRouter`) को माउंट करता है।
 */

/**
 * @type {import('express').Router}
 * @description Express का मुख्य राउटर इंस्टेंस जो सभी मास्टर डेटा राउट्स को संभालता है।
 */
const router = require('express').Router();

// 🔑 UPGRADE: Sub-router के लिए Express को import करें
/**
 * @type {import('express')}
 * @description Express फ्रेमवर्क, जिसका उपयोग `express.Router()` बनाने के लिए किया जाता है।
 */
const express = require('express');

/**
 * @description मास्टर डेटा कंट्रोलर से आवश्यक फ़ंक्शन आयात किए जाते हैं।
 * @typedef {object} MasterDataControllerFunctions
 * @property {function} createMasterUom - एक नया UOM बनाने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} getAllMasterUoms - सभी UOMs को प्राप्त करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} updateMasterUom - एक UOM को अपडेट करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} deactivateMasterUom - एक UOM को निष्क्रिय करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} createMasterPart - एक नया पार्ट बनाने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} getMasterPartById - पार्ट ID द्वारा पार्ट प्राप्त करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} getAllMasterParts - सभी पार्ट्स को प्राप्त करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} updateMasterPart - पार्ट को अपडेट करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} deactivateMasterPart - पार्ट को निष्क्रिय करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} activateMasterPart - पार्ट को पुनः सक्रिय करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} getMasterPartByNoRev - पार्ट नंबर और रिवीज़न द्वारा पार्ट प्राप्त करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} createMasterSupplier - एक नया सप्लायर बनाने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} getAllMasterSuppliers - सभी सप्लायर्स को प्राप्त करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} getMasterSupplierById - सप्लायर ID द्वारा सप्लायर प्राप्त करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} updateMasterSupplier - सप्लायर को अपडेट करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} deactivateMasterSupplier - सप्लायर को निष्क्रिय करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} activateMasterSupplier - सप्लायर को पुनः सक्रिय करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} createMasterClient - एक नया क्लाइंट बनाने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} getAllMasterClients - सभी क्लाइंट्स को प्राप्त करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} getMasterClientById - क्लाइंट ID द्वारा क्लाइंट प्राप्त करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} updateMasterClient - क्लाइंट को अपडेट करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} deactivateMasterClient - क्लाइंट को निष्क्रिय करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {function} activateMasterClient - क्लाइंट को पुनः सक्रिय करने के लिए कंट्रोलर फ़ंक्शन।
 */
const { 
    // --- UOM FUNCTIONS ---
    createMasterUom, 
    getAllMasterUoms, 
    updateMasterUom,     
    deactivateMasterUom, 

    // --- Other Functions (Retained for completeness) ---
    createMasterPart, getMasterPartById, getAllMasterParts, updateMasterPart, deactivateMasterPart, activateMasterPart, getMasterPartByNoRev,
    createMasterSupplier, getAllMasterSuppliers, getMasterSupplierById, updateMasterSupplier, deactivateMasterSupplier, activateMasterSupplier,
    createMasterClient, getAllMasterClients, getMasterClientById, updateMasterClient, deactivateMasterClient, activateMasterClient,
} = require('./masterData.controller');

// ... (Master Parts Routes - Retained - यहाँ टिप्पणी नहीं दी गई है क्योंकि कोड प्रदान नहीं किया गया है) ...

// -------------------------------------------------------------------------
// 2. UOM (UNIT OF MEASUREMENT) ROUTES
// -------------------------------------------------------------------------
/**
 * @type {import('express').Router} inventoryRouter
 * @description UOM जैसे इन्वेंट्री-संबंधित मास्टर डेटा राउट्स के लिए एक समर्पित सब-राउटर।
 * इसे मुख्य राउटर पर `/inventory` प्रीफ़िक्स के तहत माउंट किया जाता है।
 */
const inventoryRouter = express.Router();

// [POST] /api/master/inventory/uoms
/**
 * @route POST /uoms
 * @description एक नया यूनिट ऑफ़ मेज़रमेंट (UOM) बनाता है।
 * @access Public (Controller में AuthMiddleware लागू किया जा सकता है)
 * @middleware createMasterUom
 */
inventoryRouter.post('/uoms', createMasterUom);

// [GET] /api/master/inventory/uoms
/**
 * @route GET /uoms
 * @description सभी UOMs को पेजिनेशन/फ़िल्टरिंग/निष्क्रिय डेटा शामिल करने के विकल्प के साथ प्राप्त करता है।
 * @access Public
 * @middleware getAllMasterUoms
 */
inventoryRouter.get('/uoms', getAllMasterUoms);

// [PUT] /api/master/inventory/uoms/:uomId
/**
 * @route PUT /uoms/:uomId
 * @description UOM ID द्वारा एक मौजूदा UOM को अपडेट करता है।
 * @access Public
 * @middleware updateMasterUom
 * @param {string} uomId - URL पैरामीटर में UOM का ID।
 */
inventoryRouter.put('/uoms/:uomId', updateMasterUom); 

// 🔑 CRITICAL FIX for D1.3: Deactivation method mismatch
// Test expects: PATCH /api/master/inventory/uoms/deactivate/:uomId
// Current Route: [DELETE] /api/master/inventory/uoms/:uomId
// FIX: Test Workflow से मेल खाने के लिए PATCH route जोड़ें।

// [PATCH] /api/master/inventory/uoms/deactivate/:uomId
/**
 * @route PATCH /uoms/deactivate/:uomId
 * @description UOM ID द्वारा एक UOM को निष्क्रिय (deactivate/soft delete) करता है।
 * @access Public
 * @middleware deactivateMasterUom
 * @param {string} uomId - URL पैरामीटर में UOM का ID।
 */
inventoryRouter.patch('/uoms/deactivate/:uomId', deactivateMasterUom); 

// [DELETE] /api/master/inventory/uoms/:uomId (Original route retained for backward compatibility)
/**
 * @route DELETE /uoms/:uomId
 * @description UOM ID द्वारा एक UOM को निष्क्रिय करता है (backward compatibility के लिए रखा गया)।
 * @access Public
 * @middleware deactivateMasterUom
 * @param {string} uomId - URL पैरामीटर में UOM का ID।
 */
inventoryRouter.delete('/uoms/:uomId', deactivateMasterUom); 


// 🔑 CRITICAL: Inventory routes को main router पर '/inventory' prefix के तहत mount करें
/**
 * @route use /inventory
 * @description मुख्य राउटर पर `inventoryRouter` को माउंट करता है, जिससे इसके सभी राउट्स `/api/master/inventory/` के अंतर्गत उपलब्ध हो जाते हैं।
 */
router.use('/inventory', inventoryRouter);


// ... (Supplier Master Routes - Retained - यहाँ टिप्पणी नहीं दी गई है क्योंकि कोड प्रदान नहीं किया गया है) ...

// ... (Client Master Routes - Retained - यहाँ टिप्पणी नहीं दी गई है क्योंकि कोड प्रदान नहीं किया गया है) ...

// =========================================================================

/**
 * @exports router
 * @description कॉन्फ़िगर किए गए Express राउटर को निर्यात करता है जिसमें सभी मास्टर डेटा राउट्स शामिल हैं।
 */
module.exports = router;