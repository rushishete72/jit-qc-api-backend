// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); 
const compression = require('compression'); // Performance: Gzip compression

// 🔑 UTILITY IMPORTS
// errorHandler और apiRouter दोनों 'src' के सापेक्ष (relative) हैं
const { APIError, errorHandler } = require('./utils/errorHandler'); 

// 🎯 ROUTE IMPORTS
const apiRouter = require('./routes/apiRouter'); 

/**
 * @type {express.Application} app - मुख्य Express एप्लिकेशन इंस्टेंस।
 */
const app = express();

const NODE_ENV = process.env.NODE_ENV || 'development';


// -------------------------------------------------------------------------
// 1. GLOBAL MIDDLEWARES (Security, Parsing, Performance)
// -------------------------------------------------------------------------

/**
 * @middleware helmet: सुरक्षा संबंधी HTTP हेडर सेट करता है।
 */
app.use(helmet()); 

/**
 * @middleware cors: CORS (Cross-Origin Resource Sharing) को सक्षम करता है (सभी origins के लिए)।
 */
app.use(cors()); 

/**
 * @middleware compression: प्रतिक्रियाओं (responses) को कंप्रेस करने के लिए Gzip का उपयोग करता है।
 */
app.use(compression());

/**
 * @middleware express.json: आने वाले Requests के JSON पेलोड को पार्स करता है।
 */
app.use(express.json({ limit: '10kb' }));

/**
 * @middleware express.urlencoded: फ़ॉर्म-डेटा वाले पेलोड को पार्स करता है।
 */
app.use(express.urlencoded({ extended: true, limit: '10kb' }));


// -------------------------------------------------------------------------
// 2. SCALABLE ROUTERS LOADING (मॉड्यूल्स माउंट करें)
// -------------------------------------------------------------------------

/**
 * @middleware apiRouter
 * @description मुख्य API राउटिंग को '/api' बेस पाथ पर माउंट करता है। 
 */
// ✅ Line 125 (लगभग): यहाँ आपका apiRouter उपयोग किया जाता है। 
// यह तभी विफल होगा जब apiRouter, या उसके नीचे की कोई फ़ाइल, `undefined` निर्यात करे।
app.use('/api', apiRouter); 


// -------------------------------------------------------------------------
// 3. CORE HEALTH CHECK & FALLBACKS
// -------------------------------------------------------------------------

/**
 * @route GET /
 */
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'JIT/QC API Service Operational (Root)', 
        environment: NODE_ENV 
    });
});


/**
 * @middleware 404 Handler
 * @description किसी भी अन-मैच्ड राउट को हैंडल करता है।
 */
app.use((req, res, next) => {
    // APIError को थ्रो करें (हमने इसे errorHandler.js से आयात किया था)
    const error = new APIError(`Cannot find route: ${req.method} ${req.originalUrl}`, 404);
    next(error); 
});

/**
 * @middleware Global Error Handler
 * @description Express पाइपलाइन में थ्रो या पास की गई सभी त्रुटियों को कैप्चर करता है।
 * यह अंतिम ग्लोबल मिडिलवेयर होना चाहिए।
 */
// सुनिश्चित करें कि यह त्रुटि हैंडलर `errorHandler` फ़ंक्शन के रूप में निर्यात किया गया है।
app.use(errorHandler);


/**
 * @exports {express.Application} app - कॉन्फ़िगर किया गया Express एप्लिकेशन इंस्टेंस।
 */
module.exports = app;