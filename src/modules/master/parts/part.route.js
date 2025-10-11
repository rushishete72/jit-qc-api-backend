// src/modules/master/parts/part.route.js

/**
 * @fileoverview यह मॉड्यूल Parts मास्टर डेटा के लिए सभी API राउट्स (routes) को परिभाषित करता है।
 * यह CRUD ऑपरेशन के लिए राउटिंग को संभालता है और उपयुक्त कंट्रोलर फ़ंक्शंस पर पहुँचने से पहले
 * प्रमाणीकरण (authentication) और प्राधिकरण (authorization) मिडिलवेयर लागू करता है।
 */

/**
 * @type {import('express').Router}
 * @description Express का राउटर इंस्टेंस जो पार्ट मास्टर राउट्स को संभालता है।
 */
const express = require('express');
const router = express.Router();

// ✅ सही पाथ और फ़ाइल नाम: '../../../middleware/auth'
/**
 * @typedef {object} AuthMiddleware
 * @property {import('express').RequestHandler} authenticate - JWT प्रमाणीकरण (Authentication) मिडिलवेयर।
 * @property {(roles: string|string[]) => import('express').RequestHandler} authorize - उपयोगकर्ता की भूमिका (Role) के आधार पर प्राधिकरण (Authorization) मिडिलवेयर फ़ैक्ट्री।
 */
/** @type {AuthMiddleware} */
const { authenticate, authorize } = require('../../../middleware/auth'); 

// कंट्रोलर फ़ंक्शंस को Destructure करें
/**
 * @typedef {object} PartControllerFunctions
 * @property {import('express').RequestHandler} getAllParts - सभी पार्ट्स को प्राप्त करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {import('express').RequestHandler} getPartById - ID द्वारा एक पार्ट प्राप्त करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {import('express').RequestHandler} createPart - एक नया पार्ट बनाने के लिए कंट्रोलर फ़ंक्शन।
 * @property {import('express').RequestHandler} updatePart - एक पार्ट को अपडेट करने के लिए कंट्रोलर फ़ंक्शन।
 * @property {import('express').RequestHandler} deletePart - एक पार्ट को डिलीट करने के लिए कंट्रोलर फ़ंक्शन।
 */
/** @type {PartControllerFunctions} */
const { 
    getAllParts, 
    getPartById, 
    createPart, 
    updatePart, 
    deletePart 
} = require('./part.controller'); 

// -------------------------------------------------------------------------
// Routes Definition
// -------------------------------------------------------------------------

/**
 * @route GET /api/master/parts/
 * @description सभी पार्ट रिकॉर्ड्स को प्राप्त करता है (पेजिनेशन, फ़िल्टरिंग के साथ)।
 * @access Private (Requires JWT and PART_VIEW_ALL permission)
 * @middleware {authenticate, authorize('PART_VIEW_ALL'), getAllParts}
 */
/**
 * @route POST /api/master/parts/
 * @description एक नया पार्ट रिकॉर्ड बनाता है।
 * @access Private (Requires JWT and PART_CREATE permission)
 * @middleware {authenticate, authorize('PART_CREATE'), createPart}
 */
router.route('/')
    .get(authenticate, authorize('PART_VIEW_ALL'), getAllParts)
    .post(authenticate, authorize('PART_CREATE'), createPart);

/**
 * @route GET /api/master/parts/:id
 * @description ID द्वारा एक विशिष्ट पार्ट रिकॉर्ड प्राप्त करता है।
 * @access Private (Requires JWT and PART_VIEW_ONE permission)
 * @middleware {authenticate, authorize('PART_VIEW_ONE'), getPartById}
 */
/**
 * @route PUT /api/master/parts/:id
 * @description ID द्वारा एक मौजूदा पार्ट रिकॉर्ड को अपडेट करता है।
 * @access Private (Requires JWT and PART_UPDATE permission)
 * @middleware {authenticate, authorize('PART_UPDATE'), updatePart}
 */
/**
 * @route DELETE /api/master/parts/:id
 * @description ID द्वारा एक पार्ट रिकॉर्ड को डिलीट/निष्क्रिय करता है।
 * @access Private (Requires JWT and PART_DELETE permission)
 * @middleware {authenticate, authorize('PART_DELETE'), deletePart}
 */
router.route('/:id')
    .get(authenticate, authorize('PART_VIEW_ONE'), getPartById)
    .put(authenticate, authorize('PART_UPDATE'), updatePart)
    .delete(authenticate, authorize('PART_DELETE'), deletePart);

/**
 * @exports router
 * @description कॉन्फ़िगर किए गए Express राउटर को निर्यात करता है।
 */
module.exports = router;